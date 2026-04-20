local HttpService = game:GetService("HttpService")
local Constants = require(script.Parent.constants)
local UuidService = require(script.Parent["uuid-service"])
local BridgeClient = require(script.Parent["bridge-client"])
local BridgeProtocol = require(script.Parent["bridge-protocol"])
local State = require(script.Parent.state)
local Logger = require(script.Parent.logger)

local ExportService = {}

local SERVICE_SET = {}
for _, name in Constants.SERVICE_NAMES do
	SERVICE_SET[name] = true
end

local function collectAncestors(instance)
	local ancestors = {}
	local current = instance.Parent
	while current and current ~= game do
		table.insert(ancestors, 1, current)
		current = current.Parent
	end
	return ancestors
end

local function ensureAllUuids(root)
	UuidService.ensureUuid(root)
	for _, child in root:GetChildren() do
		ensureAllUuids(child)
	end
end

local function serializeInstance(instance)
	local uuid = UuidService.getUuid(instance)
	if not uuid then return nil end

	local data = {
		uuid = uuid,
		className = instance.ClassName,
		name = instance.Name,
		properties = {},
		attributes = {},
		tags = {},
		children = {},
	}

	pcall(function()
		data.tags = instance:GetTags()
	end)

	local ok, attrs = pcall(function()
		return instance:GetAttributes()
	end)
	if ok and attrs then
		for key, value in attrs do
			if key ~= Constants.UUID_ATTRIBUTE then
				data.attributes[key] = value
			end
		end
	end

	for _, child in instance:GetChildren() do
		local childUuid = UuidService.getUuid(child)
		if childUuid then
			table.insert(data.children, childUuid)
		end
	end

	return data
end

local function serializeScript(instance)
	local uuid = UuidService.getUuid(instance)
	if not uuid then return nil end

	local scriptType = "module"
	if instance.ClassName == "Script" then
		scriptType = "server"
	elseif instance.ClassName == "LocalScript" then
		scriptType = "client"
	end

	local source = ""
	pcall(function()
		source = instance.Source
	end)

	return {
		uuid = uuid,
		name = instance.Name,
		scriptType = scriptType,
		source = source,
		className = instance.ClassName,
	}
end

local function collectTree(root, instances, scripts, visited)
	if visited[root] then return end
	visited[root] = true

	local data = serializeInstance(root)
	if data then
		table.insert(instances, data)
	end

	for _, child in root:GetChildren() do
		if Constants.SCRIPT_CLASSES[child.ClassName] then
			local scriptData = serializeScript(child)
			if scriptData then
				table.insert(scripts, scriptData)
			end
		else
			collectTree(child, instances, scripts, visited)
		end
	end
end

function ExportService.exportSelection(selectedInstances)
	Logger.info("Starting export for " .. #selectedInstances .. " selected instances")

	for _, inst in selectedInstances do
		ensureAllUuids(inst)
		local ancestors = collectAncestors(inst)
		for _, ancestor in ancestors do
			UuidService.ensureUuid(ancestor)
		end
	end

	local instances = {}
	local scripts = {}
	local selectedUuids = {}
	local ancestorUuids = {}
	local visited = {}
	local ancestorSeen = {}

	for _, inst in selectedInstances do
		local ancestors = collectAncestors(inst)
		for _, ancestor in ancestors do
			local aUuid = UuidService.getUuid(ancestor)
			if aUuid and not ancestorSeen[aUuid] then
				ancestorSeen[aUuid] = true
				table.insert(ancestorUuids, aUuid)

				if not visited[ancestor] then
					local aData = serializeInstance(ancestor)
					if aData then
						visited[ancestor] = true
						table.insert(instances, aData)
					end
				end
			end
		end

		local uuid = UuidService.getUuid(inst)
		if uuid then
			table.insert(selectedUuids, uuid)
		end

		collectTree(inst, instances, scripts, visited)
	end

	Logger.info("Collected: " .. #instances .. " instances, " .. #scripts .. " scripts")

	local payload = BridgeProtocol.createExportPayload(instances, scripts, selectedUuids, ancestorUuids)
	local response, err = BridgeClient.request("export/push", payload.payload)

	if not response then
		Logger.error("Export failed: " .. tostring(err))
		return false, err
	end

	Logger.info("Export completed successfully")
	return true, nil
end

function ExportService.exportAll()
	Logger.info("Starting full export of all services")

	local allInstances = {}

	for _, serviceName in Constants.SERVICE_NAMES do
		local success, svc = pcall(function()
			return game:GetService(serviceName)
		end)
		if success and svc then
			table.insert(allInstances, svc)
		end
	end

	return ExportService.exportSelection(allInstances)
end

local function hasScriptDescendant(instance)
	for _, child in instance:GetChildren() do
		if Constants.SCRIPT_CLASSES[child.ClassName] then
			return true
		end
		if hasScriptDescendant(child) then
			return true
		end
	end
	return false
end

local function collectScriptBranches(root, results, visited)
	if visited[root] then return end

	for _, child in root:GetChildren() do
		if Constants.SCRIPT_CLASSES[child.ClassName] then
			if not visited[root] then
				visited[root] = true
				table.insert(results, root)
			end
		elseif hasScriptDescendant(child) then
			collectScriptBranches(child, results, visited)
		end
	end
end

function ExportService.exportScriptsOnly()
	Logger.info("Starting export: scripts only (skip objects without scripts)")

	local targets = {}
	local visited = {}

	for _, serviceName in Constants.SERVICE_NAMES do
		local success, svc = pcall(function()
			return game:GetService(serviceName)
		end)
		if success and svc then
			if hasScriptDescendant(svc) then
				collectScriptBranches(svc, targets, visited)
			end
		end
	end

	if #targets == 0 then
		Logger.info("No instances with scripts found")
		return true, nil
	end

	Logger.info("Found " .. #targets .. " instances with scripts")
	return ExportService.exportSelection(targets)
end

return ExportService
