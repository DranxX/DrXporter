local Constants = require(script.Parent.constants)
local UuidService = require(script.Parent["uuid-service"])
local BridgeClient = require(script.Parent["bridge-client"])
local BridgeProtocol = require(script.Parent["bridge-protocol"])
local Logger = require(script.Parent.logger)
local Properties = require(script.Parent.serializer.properties)

local ImportService = {}

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

function ImportService.importFromBridge(requestedUuids)
	Logger.info("Starting import for " .. #requestedUuids .. " UUIDs")

	local payload = BridgeProtocol.createImportPayload(requestedUuids)
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

	if data.scripts then
		for _, scriptData in data.scripts do
			local ok = ImportService.applyScript(scriptData)
			if ok then applied = applied + 1 end
		end
	end

	if data.instances then
		for _, instanceData in data.instances do
			local ok = ImportService.applyInstance(instanceData)
			if ok then applied = applied + 1 end
		end
	end

	Logger.info("Import completed: " .. applied .. " items applied")
	return true, nil
end

function ImportService.applyInstance(instanceData)
	local uuid = instanceData.uuid
	if not uuid then return false end

	local target = ImportService.findByUuid(uuid)
	if not target then
		Logger.warn("Instance not found for UUID: " .. uuid)
		return false
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
		Logger.warn("Script not found for UUID: " .. uuid)
		return false
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
