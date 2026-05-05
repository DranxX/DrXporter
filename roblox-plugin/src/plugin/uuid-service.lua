local HttpService = game:GetService("HttpService")
local Constants = require(script.Parent.constants)
local Logger = require(script.Parent.logger)

local UuidService = {}

function UuidService.generateUuid()
	return HttpService:GenerateGUID(false)
end

function UuidService.getUuid(instance)
	local success, uuid = pcall(function()
		return instance:GetAttribute(Constants.UUID_ATTRIBUTE)
	end)
	if success and typeof(uuid) == "string" and #uuid > 0 then
		return uuid
	end
	return nil
end

function UuidService.setUuid(instance, uuid)
	local success, err = pcall(function()
		instance:SetAttribute(Constants.UUID_ATTRIBUTE, uuid)
	end)
	if not success then
		Logger.error("Failed to set UUID on " .. instance:GetFullName() .. ": " .. tostring(err))
		return false
	end
	return true
end

function UuidService.ensureUuid(instance)
	local existing = UuidService.getUuid(instance)
	if existing then return existing end

	local uuid = UuidService.generateUuid()
	local ok = UuidService.setUuid(instance, uuid)
	if ok then return uuid end
	return nil
end

function UuidService.ensureUniqueUuid(instance, seen)
	local uuid = UuidService.ensureUuid(instance)
	if not uuid then return nil, false end

	if seen and seen[uuid] and seen[uuid] ~= instance then
		local newUuid = UuidService.generateUuid()
		if UuidService.setUuid(instance, newUuid) then
			seen[newUuid] = instance
			return newUuid, true
		end
		return uuid, false
	end

	if seen then
		seen[uuid] = instance
	end
	return uuid, false
end

function UuidService.ensureUniqueTree(root, seen)
	seen = seen or {}
	local resolved = 0
	local _, rewritten = UuidService.ensureUniqueUuid(root, seen)
	if rewritten then
		resolved += 1
	end

	for _, child in root:GetChildren() do
		resolved += UuidService.ensureUniqueTree(child, seen)
	end

	return resolved
end

function UuidService.hasUuid(instance)
	return UuidService.getUuid(instance) ~= nil
end

function UuidService.removeUuid(instance)
	pcall(function()
		instance:SetAttribute(Constants.UUID_ATTRIBUTE, nil)
	end)
end

function UuidService.collectUuids(root)
	local uuids = {}
	local function traverse(inst)
		local uuid = UuidService.getUuid(inst)
		if uuid then
			table.insert(uuids, { uuid = uuid, instance = inst })
		end
		for _, child in inst:GetChildren() do
			traverse(child)
		end
	end
	traverse(root)
	return uuids
end

return UuidService
