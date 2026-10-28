local UuidService = require(script.Parent.Parent["uuid-service"])
local Logger = require(script.Parent.Parent.logger)

local ParentResolver = {}

function ParentResolver.resolve(uuid, registry)
	if not registry then return nil end
	local entry = registry[uuid]
	if not entry then return nil end
	if not entry.parentUuid then return nil end
	return ParentResolver.findInstance(entry.parentUuid)
end

function ParentResolver.findInstance(uuid)
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

function ParentResolver.buildRegistry(instances)
	local registry = {}
	for _, data in instances do
		if data.uuid then
			registry[data.uuid] = {
				uuid = data.uuid,
				className = data.className,
				name = data.name,
				parentUuid = nil,
			}
		end
	end
	return registry
end

return ParentResolver
