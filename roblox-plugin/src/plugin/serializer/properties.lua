local Properties = {}

local SERIALIZABLE_TYPES = {
	string = true,
	number = true,
	boolean = true,
}

function Properties.serialize(instance)
	local result = {}
	return result
end

function Properties.serializeValue(value)
	local t = typeof(value)

	if SERIALIZABLE_TYPES[t] then
		return { type = t, value = value }
	end

	if t == "Color3" then
		return { type = "Color3", value = { value.R, value.G, value.B } }
	end

	if t == "Vector3" then
		return { type = "Vector3", value = { value.X, value.Y, value.Z } }
	end

	if t == "Vector2" then
		return { type = "Vector2", value = { value.X, value.Y } }
	end

	if t == "UDim2" then
		return { type = "UDim2", value = { value.X.Scale, value.X.Offset, value.Y.Scale, value.Y.Offset } }
	end

	if t == "UDim" then
		return { type = "UDim", value = { value.Scale, value.Offset } }
	end

	if t == "BrickColor" then
		return { type = "BrickColor", value = value.Number }
	end

	if t == "EnumItem" then
		return { type = "Enum", value = value.Value }
	end

	if t == "CFrame" then
		return { type = "CFrame", value = { value:GetComponents() } }
	end

	return nil
end

function Properties.deserializeValue(propData)
	if not propData or type(propData) ~= "table" then return nil end

	local t = propData.type
	local v = propData.value

	if t == "string" or t == "number" or t == "boolean" then
		return v
	end

	if t == "Color3" then
		return Color3.new(v[1], v[2], v[3])
	end

	if t == "Vector3" then
		return Vector3.new(v[1], v[2], v[3])
	end

	if t == "Vector2" then
		return Vector2.new(v[1], v[2])
	end

	if t == "UDim2" then
		return UDim2.new(v[1], v[2], v[3], v[4])
	end

	if t == "UDim" then
		return UDim.new(v[1], v[2])
	end

	if t == "BrickColor" then
		return BrickColor.new(v)
	end

	if t == "CFrame" then
		return CFrame.new(unpack(v))
	end

	return nil
end

return Properties
