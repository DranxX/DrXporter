local Constants = require(script.Parent.Parent.constants)

local Attributes = {}

function Attributes.serialize(instance)
	local result = {}
	local attrs = instance:GetAttributes()
	for key, value in attrs do
		if key ~= Constants.UUID_ATTRIBUTE then
			result[key] = value
		end
	end
	return result
end

function Attributes.deserialize(instance, attributes)
	for key, value in attributes do
		if key ~= Constants.UUID_ATTRIBUTE then
			pcall(function()
				instance:SetAttribute(key, value)
			end)
		end
	end
end

return Attributes
