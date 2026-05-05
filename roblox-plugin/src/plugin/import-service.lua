local Constants = require(script.Parent.constants)
local UuidService = require(script.Parent["uuid-service"])
local BridgeClient = require(script.Parent["bridge-client"])
local BridgeProtocol = require(script.Parent["bridge-protocol"])
local Logger = require(script.Parent.logger)
local Properties = require(script.Parent.serializer.properties)

local ImportService = {}
local SERVICE_SET = {}
for _, serviceName in Constants.SERVICE_NAMES do
	SERVICE_SET[serviceName] = true
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

function ImportService.findByUuid(uuid)
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

local function findParentForData(data)
	if data.parentUuid then
		local parent = ImportService.findByUuid(data.parentUuid)
		if parent then return parent end
	end

	if data.className and SERVICE_SET[data.className] then
		local ok, svc = pcall(function()
			return game:GetService(data.className)
		end)
		if ok and svc then return svc end
	end

	local ok, workspace = pcall(function()
		return game:GetService("Workspace")
	end)
	if ok and workspace then return workspace end
	return nil
end

local function createInstanceForData(data)
	if not data.uuid or not data.className then return nil end

	if SERVICE_SET[data.className] then
		local ok, svc = pcall(function()
			return game:GetService(data.className)
		end)
		if ok and svc then
			UuidService.setUuid(svc, data.uuid)
			return svc
		end
		return nil
	end

	local parent = findParentForData(data)
	if not parent then return nil end

	local ok, inst = pcall(function()
		return Instance.new(data.className)
	end)
	if not ok or not inst then
		Logger.warn("Cannot create instance class from VSCode: " .. tostring(data.className))
		return nil
	end

	inst.Name = data.name or data.className
	UuidService.setUuid(inst, data.uuid)
	inst.Parent = parent
	return inst
end

local function deleteMissingFromImport(incoming)
	local deleted = 0

	local function visit(parent)
		for _, child in parent:GetChildren() do
			visit(child)
			local uuid = UuidService.getUuid(child)
			if uuid and not incoming[uuid] and not SERVICE_SET[child.ClassName] then
				pcall(function()
					child:Destroy()
					deleted += 1
				end)
			end
		end
	end

	for _, serviceName in Constants.SERVICE_NAMES do
		local ok, svc = pcall(function()
			return game:GetService(serviceName)
		end)
		if ok and svc then
			visit(svc)
		end
	end

	return deleted
end

function ImportService.importFromBridge(requestedUuids, options)
	options = options or {}
	Logger.info("Starting import for " .. #requestedUuids .. " UUIDs")

	local payload = BridgeProtocol.createImportPayload(requestedUuids, options.all == true, options.force == true)
	local response, err = BridgeClient.request("import/pull", payload.payload)

	if not response then
		Logger.error("Import request failed: " .. tostring(err))
		return false, err
	end

	if not response.success then
		Logger.error("Import rejected: " .. tostring(response.error and response.error.message))
		return false, response.error
	end

	local data = response.payload
	if not data then
		Logger.error("Import response has no payload")
		return false, "No payload"
	end

	local applied = 0
	local incoming = {}

	if data.instances then
		for _, instanceData in data.instances do
			if instanceData.uuid then incoming[instanceData.uuid] = true end
			local ok = ImportService.applyInstance(instanceData)
			if ok then applied = applied + 1 end
		end
	end

	if data.scripts then
		for _, scriptData in data.scripts do
			if scriptData.uuid then incoming[scriptData.uuid] = true end
			local ok = ImportService.applyScript(scriptData)
			if ok then applied = applied + 1 end
		end
	end

	if data.force then
		local deleted = deleteMissingFromImport(incoming)
		if deleted > 0 then
			Logger.warn("Force import removed " .. deleted .. " Roblox item(s)")
		end
	end

	Logger.info("Import completed: " .. applied .. " items applied")
	return true, nil
end

function ImportService.importAllFromBridge(force)
	return ImportService.importFromBridge({}, { all = true, force = force == true })
end

function ImportService.applyInstance(instanceData)
	local uuid = instanceData.uuid
	if not uuid then return false end

	local target = ImportService.findByUuid(uuid)
	if not target then
		target = createInstanceForData(instanceData)
		if not target then
			Logger.warn("Instance not found for UUID: " .. uuid)
			return false
		end
	end

	if instanceData.name and instanceData.name ~= target.Name then
		pcall(function() target.Name = instanceData.name end)
	end

	applyProperties(target, instanceData.properties)
	applyAttributes(target, instanceData.attributes)
	applyTags(target, instanceData.tags)

	return true
end

function ImportService.applyScript(scriptData)
	local uuid = scriptData.uuid
	if not uuid then return false end

	local target = ImportService.findByUuid(uuid)
	if not target then
		target = createInstanceForData({
			uuid = uuid,
			className = scriptData.className or "ModuleScript",
			name = scriptData.name or "ModuleScript",
			parentUuid = scriptData.parentUuid,
		})
		if not target then
			Logger.warn("Script not found for UUID: " .. uuid)
			return false
		end
	end

	if scriptData.source then
		pcall(function() target.Source = scriptData.source end)
	end

	if scriptData.name and scriptData.name ~= target.Name then
		pcall(function() target.Name = scriptData.name end)
	end

	return true
end

function ImportService.collectUuidsFromSelection(selectedInstances)
	local uuids = {}
	local seen = {}

	local function collect(instance)
		local uuid = UuidService.getUuid(instance)
		if uuid and not seen[uuid] then
			seen[uuid] = true
			table.insert(uuids, uuid)
		end
		for _, child in instance:GetChildren() do
			collect(child)
		end
	end

	for _, inst in selectedInstances do
		collect(inst)
	end

	return uuids
end

return ImportService
