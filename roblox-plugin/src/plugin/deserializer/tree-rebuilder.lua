local UuidService = require(script.Parent.Parent["uuid-service"])
local Logger = require(script.Parent.Parent.logger)

local TreeRebuilder = {}

function TreeRebuilder.rebuild(instanceDataList, parentMap)
	local created = {}

	for _, data in instanceDataList do
		local existing = TreeRebuilder.findByUuid(data.uuid)
		if existing then
			created[data.uuid] = existing
		end
	end

	return created
end

function TreeRebuilder.findByUuid(uuid)
	local function search(parent)
		for _, child in parent:GetChildren() do
			local childUuid = UuidService.getUuid(child)
			if childUuid == uuid then return child end
			local found = search(child)
			if found then return found end
		end
		return nil
	end
	return search(game)
end

function TreeRebuilder.updateParent(instance, newParent)
	if not instance or not newParent then return false end
	if instance.Parent == newParent then return true end

	local success, err = pcall(function()
		instance.Parent = newParent
	end)

	if not success then
		Logger.error("Failed to reparent: " .. tostring(err))
		return false
	end

	return true
end

return TreeRebuilder
