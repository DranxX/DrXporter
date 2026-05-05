local HttpService = game:GetService("HttpService")
local State = require(script.Parent.state)
local UuidService = require(script.Parent["uuid-service"])
local Constants = require(script.Parent.constants)
local Logger = require(script.Parent.logger)
local InstanceJsonSerializer = require(script.Parent.serializer["instance-json"])
local ScriptFileSerializer = require(script.Parent.serializer["script-file"])
local Properties = require(script.Parent.serializer.properties)

local SyncService = {}

local _polling = false
local POLL_INTERVAL = 2
local STUDIO_SCAN_INTERVAL = 3
local _recentSynced = {}
local SYNC_COOLDOWN = 5
local _sourceHashes = {}
local _metadataHashes = {}
local _instanceCache = {}
local _knownUuids = {}
local _refreshing = false
local _lastCacheRefresh = 0
local CACHE_REFRESH_INTERVAL = STUDIO_SCAN_INTERVAL

local function hashSource(source)
	if #source == 0 then return 0 end
	local h1, h2 = 0, 0
	local len = #source
	local step = math.max(1, math.floor(len / 1000))
	for i = 1, len, step do
		h1 = (h1 * 31 + string.byte(source, i)) % 1000000007
	end
	h2 = len * 1000000 + string.byte(source, 1) * 1000 + string.byte(source, len)
	return h1 * 10000000000 + h2
end

local function stableEncode(value)
	local valueType = typeof(value)

	if valueType == "table" then
		local count = 0
		local maxIndex = 0
		local arrayLike = true

		for key in value do
			count += 1
			if type(key) ~= "number" or key < 1 or key % 1 ~= 0 then
				arrayLike = false
			elseif key > maxIndex then
				maxIndex = key
			end
		end

		if arrayLike and maxIndex == count then
			local parts = {}
			for i = 1, maxIndex do
				table.insert(parts, stableEncode(value[i]))
			end
			return "[" .. table.concat(parts, ",") .. "]"
		end

		local keys = {}
		for key in value do
			table.insert(keys, { sortKey = tostring(key), key = key })
		end
		table.sort(keys, function(a, b)
			return a.sortKey < b.sortKey
		end)

		local parts = {}
		for _, entry in keys do
			table.insert(parts, entry.sortKey .. ":" .. stableEncode(value[entry.key]))
		end
		return "{" .. table.concat(parts, ",") .. "}"
	end

	return tostring(valueType) .. ":" .. tostring(value)
end

local function getParentUuid(instance)
	local parent = instance.Parent
	if not parent or parent == game then return nil end
	return UuidService.getUuid(parent)
end

local function buildMetadata(instance)
	local data = InstanceJsonSerializer.serialize(instance)
	if not data then return nil end
	data.parentUuid = getParentUuid(instance)
	return data
end

local function metadataHash(instance)
	local data = buildMetadata(instance)
	if not data then return nil end
	return hashSource(stableEncode(data))
end

local function findInstanceByUuid(uuid)
	for _, entry in _instanceCache do
		if entry.uuid == uuid and entry.instance and entry.instance.Parent then
			return entry.instance
		end
	end

	local function search(parent)
		for _, child in parent:GetChildren() do
			local childUuid = UuidService.getUuid(child)
			if childUuid == uuid then return child end
			local found = search(child)
			if found then return found end
		end
		return nil
	end

	for _, serviceName in Constants.SERVICE_NAMES do
		local ok, svc = pcall(function()
			return game:GetService(serviceName)
		end)
		if ok and svc then
			local svcUuid = UuidService.getUuid(svc)
			if svcUuid == uuid then return svc end
			local found = search(svc)
			if found then return found end
		end
	end
	return nil
end

local function refreshInstanceCache(force)
	local now = os.clock()
	if not force and now - _lastCacheRefresh < CACHE_REFRESH_INTERVAL and #_instanceCache > 0 then
		return
	end
	_lastCacheRefresh = now

	local function ensureTree(instance)
		UuidService.ensureUuid(instance)
		for _, child in instance:GetChildren() do
			ensureTree(child)
		end
	end

	local newCache = {}
	local currentUuids = {}
	local function traverse(instance)
		local uuid = UuidService.getUuid(instance)
		if uuid then
			table.insert(newCache, { instance = instance, uuid = uuid })
			currentUuids[uuid] = true
		end

		for _, child in instance:GetChildren() do
			traverse(child)
		end
	end

	for _, serviceName in Constants.SERVICE_NAMES do
		local ok, svc = pcall(function()
			return game:GetService(serviceName)
		end)
		if ok and svc then
			ensureTree(svc)
			traverse(svc)
		end
	end

	_instanceCache = newCache
	return currentUuids
end

local function serializePushPayload(instance, uuid)
	local isScript = Constants.SCRIPT_CLASSES[instance.ClassName] ~= nil
	local data

	if isScript then
		data = ScriptFileSerializer.serialize(instance)
	else
		data = InstanceJsonSerializer.serialize(instance)
	end

	if not data then return nil end
	data.cacheKey = State.getCacheKey()
	data.type = isScript and "script" or "instance"
	data.parentUuid = getParentUuid(instance)
	data.timestamp = os.time()
	return data
end

local function pushInstanceToServer(instance, uuid)
	if not State.isConnected() then return end

	local data = serializePushPayload(instance, uuid)
	if not data then return end

	local payload = {
		requestId = HttpService:GenerateGUID(false),
		action = "sync/push-from-studio",
		payload = data,
		timestamp = os.time(),
	}

	task.spawn(function()
		local ok, response = pcall(function()
			return HttpService:RequestAsync({
				Url = State.getBridgeUrl() .. "/sync/push-from-studio",
				Method = "POST",
				Headers = { ["Content-Type"] = "application/json" },
				Body = HttpService:JSONEncode(payload),
			})
		end)
		if ok and response and response.StatusCode == 200 then
			Logger.info("Sync to VSCode: " .. instance:GetFullName())
		else
			local status = response and response.StatusCode or tostring(response)
			Logger.warn("Sync to VSCode failed: " .. tostring(status))
		end
	end)
end

local function applyAttributes(target, attributes)
	if not attributes then return end

	local ok, existing = pcall(function()
		return target:GetAttributes()
	end)
	if ok and existing then
		for key in existing do
			if key ~= Constants.UUID_ATTRIBUTE and attributes[key] == nil then
				pcall(function()
					target:SetAttribute(key, nil)
				end)
			end
		end
	end

	for key, value in attributes do
		if key ~= Constants.UUID_ATTRIBUTE then
			pcall(function()
				target:SetAttribute(key, value)
			end)
		end
	end
end

local function applyTags(target, tags)
	if not tags then return end

	local incoming = {}
	for _, tag in tags do
		incoming[tag] = true
	end

	local ok, existing = pcall(function()
		return target:GetTags()
	end)
	if ok and existing then
		for _, tag in existing do
			if not incoming[tag] then
				pcall(function()
					target:RemoveTag(tag)
				end)
			end
		end
	end

	for tag in incoming do
		pcall(function()
			if not target:HasTag(tag) then
				target:AddTag(tag)
			end
		end)
	end
end

local function applyProperties(target, properties)
	if not properties then return end

	for propertyName, propertyData in properties do
		local value = Properties.deserializeValue(propertyData)
		if value ~= nil then
			pcall(function()
				target[propertyName] = value
			end)
		end
	end
end

local function refreshHashesFor(target, uuid)
	if Constants.SCRIPT_CLASSES[target.ClassName] then
		local source = ""
		pcall(function()
			source = target.Source
		end)
		_sourceHashes[uuid] = hashSource(source)
	end

	local hash = metadataHash(target)
	if hash then
		_metadataHashes[uuid] = hash
	end
end

local function applyInstanceChange(change)
	local data = change.data or change
	local uuid = data.uuid or change.uuid
	if not uuid then return false end

	local target = findInstanceByUuid(uuid)
	if not target then return false end

	_recentSynced[uuid] = os.clock()

	if data.name and data.name ~= target.Name then
		pcall(function()
			target.Name = data.name
		end)
	end

	applyProperties(target, data.properties)
	applyAttributes(target, data.attributes)
	applyTags(target, data.tags)
	refreshHashesFor(target, uuid)
	Logger.info("Sync from VSCode: " .. target:GetFullName())
	return true
end

local function applyScriptChange(change)
	local target = findInstanceByUuid(change.uuid)
	if not target then return false end
	if not Constants.SCRIPT_CLASSES[target.ClassName] then return false end

	_recentSynced[change.uuid] = os.clock()

	if change.name and change.name ~= target.Name then
		pcall(function()
			target.Name = change.name
		end)
	end

	if change.content ~= nil then
		pcall(function()
			target.Source = change.content
		end)
	end

	refreshHashesFor(target, change.uuid)
	Logger.info("Sync from VSCode: " .. target:GetFullName())
	return true
end

local function scanStudioChanges()
	if not State.isConnected() then return end
	if _refreshing then return end

	local currentUuids = refreshInstanceCache(false)
	local needsFullRefresh = false

	if currentUuids then
		for uuid in _knownUuids do
			if not currentUuids[uuid] then
				_knownUuids[uuid] = nil
				needsFullRefresh = true
			end
		end
	end

	for _, entry in _instanceCache do
		local inst = entry.instance
		local uuid = entry.uuid

		if not inst or not inst.Parent then continue end

		if not _knownUuids[uuid] then
			_knownUuids[uuid] = true
			refreshHashesFor(inst, uuid)
			needsFullRefresh = true
			continue
		end

		local changed = false

		if Constants.SCRIPT_CLASSES[inst.ClassName] then
			local source = ""
			local ok = pcall(function()
				source = inst.Source
			end)
			if ok then
				local currentHash = hashSource(source)
				local previousHash = _sourceHashes[uuid]
				if previousHash == nil then
					_sourceHashes[uuid] = currentHash
				elseif currentHash ~= previousHash then
					_sourceHashes[uuid] = currentHash
					changed = true
				end
			end
		end

		local currentMetadataHash = metadataHash(inst)
		if currentMetadataHash then
			local previousMetadataHash = _metadataHashes[uuid]
			if previousMetadataHash == nil then
				_metadataHashes[uuid] = currentMetadataHash
			elseif currentMetadataHash ~= previousMetadataHash then
				_metadataHashes[uuid] = currentMetadataHash
				changed = true
			end
		end

		if changed then
			pushInstanceToServer(inst, uuid)
		end
	end

	if needsFullRefresh then
		Logger.info("Studio tree changed, refreshing VSCode snapshot...")
		SyncService.refreshAll()
		return
	end

	local now = os.clock()
	for uuid, t in _recentSynced do
		if now - t > SYNC_COOLDOWN * 2 then
			_recentSynced[uuid] = nil
		end
	end
end

function SyncService.startPolling()
	if _polling then return end
	_polling = true
	Logger.info("Auto-sync started (bidirectional)")

	refreshInstanceCache(true)
	for _, entry in _instanceCache do
		refreshHashesFor(entry.instance, entry.uuid)
		_knownUuids[entry.uuid] = true
	end
	Logger.info("Indexed " .. #_instanceCache .. " instances for change detection")

	task.spawn(function()
		while _polling and State.isConnected() do
			local ok, response = pcall(function()
				return HttpService:RequestAsync({
					Url = State.getBridgeUrl() .. "/sync/changes",
					Method = "GET",
				})
			end)

			if ok and response.StatusCode == 200 then
				local decodeOk, data = pcall(function()
					return HttpService:JSONDecode(response.Body)
				end)

				if decodeOk and data and data.payload and data.payload.changes then
					local changes = data.payload.changes
					if #changes > 0 then
						Logger.info("Sync from VSCode: " .. #changes .. " item(s)")
						for _, change in changes do
							if change.type == "script" then
								applyScriptChange(change)
							elseif change.type == "instance" then
								applyInstanceChange(change)
							end
						end
					end
				end
			end

			task.wait(POLL_INTERVAL)
		end
		_polling = false
	end)

	task.spawn(function()
		task.wait(STUDIO_SCAN_INTERVAL)
		while _polling and State.isConnected() do
			scanStudioChanges()
			task.wait(STUDIO_SCAN_INTERVAL)
		end
	end)
end

function SyncService.stopPolling()
	_polling = false
	_sourceHashes = {}
	_metadataHashes = {}
	_recentSynced = {}
	_instanceCache = {}
	_knownUuids = {}
	_refreshing = false
	_lastCacheRefresh = 0
end

function SyncService.refreshAll()
	if not State.isConnected() then
		return false, "Not connected to bridge"
	end
	if _refreshing then
		return false, "Refresh already running"
	end

	_refreshing = true
	Logger.info("Manual refresh: exporting Roblox snapshot to VSCode")
	refreshInstanceCache(true)

	local ExportService = require(script.Parent["export-service"])
	local ok, success, err = pcall(function()
		return ExportService.exportAll()
	end)

	if not ok then
		_refreshing = false
		return false, success
	end

	if success then
		for _, entry in _instanceCache do
			_knownUuids[entry.uuid] = true
			refreshHashesFor(entry.instance, entry.uuid)
		end
	end

	_refreshing = false
	return success, err
end

function SyncService.requestInitialSync()
	if not State.isConnected() then return end

	Logger.info("Requesting initial sync state from server...")

	task.spawn(function()
		local ok, response = pcall(function()
			return HttpService:RequestAsync({
				Url = State.getBridgeUrl() .. "/sync/initial",
				Method = "POST",
				Headers = { ["Content-Type"] = "application/json" },
				Body = HttpService:JSONEncode({
					requestId = HttpService:GenerateGUID(false),
					action = "sync/initial",
					payload = {
						cacheKey = State.getCacheKey(),
						studioTimestamp = os.time(),
					},
					timestamp = os.time(),
				}),
			})
		end)

		if not ok or response.StatusCode ~= 200 then
			Logger.info("No cached data on server, fresh session")
			return
		end

		local decodeOk, data = pcall(function()
			return HttpService:JSONDecode(response.Body)
		end)

		if not decodeOk or not data or not data.payload then return end

		local payload = data.payload
		if payload.action == "none" then
			Logger.info("Initial sync: already in sync")
			return
		end

		if payload.action == "push-to-studio" then
			local count = 0
			if payload.instances then
				for _, instanceData in payload.instances do
					if applyInstanceChange(instanceData) then
						count += 1
					end
				end
			end
			if payload.scripts then
				for _, scriptData in payload.scripts do
					if applyScriptChange({
						uuid = scriptData.uuid,
						name = scriptData.name,
						content = scriptData.source,
					}) then
						count += 1
					end
				end
			end
			Logger.info("Initial sync from VSCode: updated " .. count .. " item(s)")

			if payload.alsoNeedFromStudio and #payload.alsoNeedFromStudio > 0 then
				Logger.info("Initial sync to VSCode: exporting Studio snapshot...")
				SyncService.refreshAll()
			end
		elseif payload.action == "pull-from-studio" then
			Logger.info("Initial sync to VSCode: exporting Studio snapshot...")
			SyncService.refreshAll()
		end
	end)
end

return SyncService
