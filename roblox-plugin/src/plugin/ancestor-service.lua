local Constants = require(script.Parent.constants)

local AncestorService = {}

local SERVICE_SET = {}
for _, name in Constants.SERVICE_NAMES do
	SERVICE_SET[name] = true
end

function AncestorService.getAncestorChain(instance)
	local chain = {}
	local current = instance.Parent

	while current and current ~= game do
		table.insert(chain, 1, current)
		if SERVICE_SET[current.ClassName] or SERVICE_SET[current.Name] then
			break
		end
		current = current.Parent
	end

	return chain
end

function AncestorService.isService(instance)
	return SERVICE_SET[instance.ClassName] or SERVICE_SET[instance.Name] or false
end

function AncestorService.getServiceRoot(instance)
	local current = instance
	while current and current.Parent ~= game do
		current = current.Parent
	end
	return current
end

return AncestorService
