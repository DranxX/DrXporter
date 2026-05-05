local HttpService = game:GetService("HttpService")
local Constants = require(script.Parent.Parent.constants)
local UuidService = require(script.Parent.Parent["uuid-service"])
local Attributes = require(script.Parent.attributes)
local Properties = require(script.Parent.properties)
local Tags = require(script.Parent.tags)

local InstanceJsonSerializer = {}

function InstanceJsonSerializer.serialize(instance)
	local uuid = UuidService.getUuid(instance)
	if not uuid then return nil end

	local data = {
		uuid = uuid,
		className = instance.ClassName,
		name = instance.Name,
		properties = Properties.serialize(instance),
		attributes = Attributes.serialize(instance),
		tags = Tags.serialize(instance),
		children = {},
	}

	for _, child in instance:GetChildren() do
		local childUuid = UuidService.getUuid(child)
		if childUuid then
			table.insert(data.children, childUuid)
		end
	end

	table.sort(data.children)
	return data
end

function InstanceJsonSerializer.toJson(instance)
	local data = InstanceJsonSerializer.serialize(instance)
	if not data then return nil end
	return HttpService:JSONEncode(data)
end

return InstanceJsonSerializer
