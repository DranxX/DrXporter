local HttpService = game:GetService("HttpService")
local State = require(script.Parent.state)
local UuidService = require(script.Parent["uuid-service"])
local Constants = require(script.Parent.constants)
local Logger = require(script.Parent.logger)

local SyncService = {}

local _polling = false
local POLL_INTERVAL = 2
local STUDIO_SCAN_INTERVAL = 3
local _recentSynced = {}
local SYNC_COOLDOWN = 5
local _sourceHashes = {}
local _scriptCache = {}
local _lastCacheRefresh = 0
local CACHE_REFRESH_INTERVAL = 30

local function findInstanceByUuid(uuid)
	for _, entry in _scriptCache do
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
			local found = search(svc)
			if found then return found end
		end
	end
	return nil
end

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

local function refreshScriptCache()
	local now = os.clock()
	if now - _lastCacheRefresh < CACHE_REFRESH_INTERVAL and #_scriptCache > 0 then
		return
	end
	_lastCacheRefresh = now

	local newCache = {}
	local function traverse(parent)
		for _, child in parent:GetChildren() do
			if Constants.SCRIPT_CLASSES[child.ClassName] then
				local uuid = UuidService.getUuid(child)
				if uuid then
					table.insert(newCache, { instance = child, uuid = uuid })
				end
			else
				traverse(child)
			end
		end
	end

	for _, serviceName in Constants.SERVICE_NAMES do
		local ok, svc = pcall(function()
			return game:GetService(serviceName)
		end)
		if ok and svc then
			traverse(svc)
		end
	end

	_scriptCache = newCache
end

local function pushScriptToServer(scriptInstance, uuid)
	if not State.isConnected() then return end

	local now = os.clock()
	if _recentSynced[uuid] and (now - _recentSynced[uuid]) < SYNC_COOLDOWN then
		return
	end

	local scriptType = "module"
	if scriptInstance.ClassName == "Script" then
		scriptType = "server"
	elseif scriptInstance.ClassName == "LocalScript" then
		scriptType = "client"
	end

	local source = ""
	pcall(function() source = scriptInstance.Source end)

	local payload = {
		requestId = HttpService:GenerateGUID(false),
		action = "sync/push-from-studio",
		payload = {
			uuid = uuid,
			name = scriptInstance.Name,
			className = scriptInstance.ClassName,
			scriptType = scriptType,
			source = source,
			timestamp = os.time(),
		},
		timestamp = os.time(),
	}

	task.spawn(function()
		local ok = pcall(function()
			HttpService:RequestAsync({
				Url = State.getBridgeUrl() .. "/sync/push-from-studio",
				Method = "POST",
				Headers = { ["Content-Type"] = "application/json" },
				Body = HttpService:JSONEncode(payload),
			})
		end)
		if ok then
			Logger.info("Sync→VSCode: " .. scriptInstance:GetFullName())
		end
	end)
end

local function applyScriptChange(change)
	local target = findInstanceByUuid(change.uuid)
	if not target then return false end
	if not Constants.SCRIPT_CLASSES[target.ClassName] then return false end

	_recentSynced[change.uuid] = os.clock()

	local ok = pcall(function() target.Source = change.content end)
	if ok then
		_sourceHashes[change.uuid] = hashSource(change.content)
		Logger.info("Sync←VSCode: " .. target:GetFullName())
	end
	return ok
end

local function scanStudioChanges()
	if not State.isConnected() then return end

	refreshScriptCache()

	for _, entry in _scriptCache do
		local inst = entry.instance
		local uuid = entry.uuid

		if not inst or not inst.Parent then continue end

		local source = ""
		local ok = pcall(function() source = inst.Source end)
		if not ok then continue end

		local currentHash = hashSource(source)
		local previousHash = _sourceHashes[uuid]

		if previousHash == nil then
			_sourceHashes[uuid] = currentHash
		elseif currentHash ~= previousHash then
			_sourceHashes[uuid] = currentHash
			pushScriptToServer(inst, uuid)
		end
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

	refreshScriptCache()
	for _, entry in _scriptCache do
		local source = ""
		pcall(function() source = entry.instance.Source end)
		_sourceHashes[entry.uuid] = hashSource(source)
	end
	Logger.info("Indexed " .. #_scriptCache .. " scripts for change detection")

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
						Logger.info("Sync←VSCode: " .. #changes .. " script(s)")
						for _, change in changes do
							if change.type == "script" then
								applyScriptChange(change)
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
	_recentSynced = {}
	_scriptCache = {}
	_lastCacheRefresh = 0
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

		if payload.action == "push-to-studio" and payload.scripts then
			local count = 0
			for _, scriptData in payload.scripts do
				local target = findInstanceByUuid(scriptData.uuid)
				if target and Constants.SCRIPT_CLASSES[target.ClassName] then
					_recentSynced[scriptData.uuid] = os.clock()
					pcall(function() target.Source = scriptData.source end)
					_sourceHashes[scriptData.uuid] = hashSource(scriptData.source)
					count = count + 1
				end
			end
			Logger.info("Initial sync←VSCode: updated " .. count .. " scripts")
		elseif payload.action == "pull-from-studio" and payload.requestedUuids then
			Logger.info("Initial sync→VSCode: server needs scripts, exporting...")
			local ExportService = require(script.Parent["export-service"])
			ExportService.exportAll()
		end
	end)
end

return SyncService
