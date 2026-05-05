local Properties = {}
local PropertySelector = require(script.Parent.Parent["property-selector"])

local SERIALIZABLE_TYPES = {
	string = true,
	number = true,
	boolean = true,
}

local CLASS_PROPERTIES = {
	Decal = { "Texture", "Color3", "Transparency", "Face" },
	Texture = { "Texture", "Color3", "Transparency", "Face", "StudsPerTileU", "StudsPerTileV" },
	Sound = { "SoundId", "Volume", "PlaybackSpeed", "Looped" },
}

local ISA_PROPERTIES = {
	BasePart = {
		"Anchored",
		"CanCollide",
		"CanTouch",
		"CanQuery",
		"CastShadow",
		"Color",
		"BrickColor",
		"Material",
		"Reflectance",
		"Transparency",
		"Size",
		"Position",
		"Orientation",
	},
	GuiObject = {
		"Visible",
		"ZIndex",
		"LayoutOrder",
		"Size",
		"Position",
		"AnchorPoint",
		"BackgroundColor3",
		"BackgroundTransparency",
		"BorderSizePixel",
	},
	TextLabel = { "Text", "TextColor3", "TextTransparency", "TextSize", "RichText" },
	TextButton = { "Text", "TextColor3", "TextTransparency", "TextSize", "RichText", "AutoButtonColor" },
	TextBox = { "Text", "TextColor3", "TextTransparency", "TextSize", "RichText", "ClearTextOnFocus" },
	ImageLabel = { "Image", "ImageColor3", "ImageTransparency", "ScaleType" },
	ImageButton = { "Image", "ImageColor3", "ImageTransparency", "ScaleType", "AutoButtonColor" },
	Light = { "Enabled", "Brightness", "Color", "Range", "Shadows" },
}

local function addUnique(list, seen, propertyName)
	if seen[propertyName] then return end
	seen[propertyName] = true
	table.insert(list, propertyName)
end

local function getPropertyNames(instance)
	local selected = PropertySelector.getProperties(instance.ClassName)
	if selected and #selected > 0 then
		return selected
	end

	local names = {}
	local seen = {}

	local classProps = CLASS_PROPERTIES[instance.ClassName]
	if classProps then
		for _, propertyName in classProps do
			addUnique(names, seen, propertyName)
		end
	end

	for className, props in ISA_PROPERTIES do
		local ok, isA = pcall(function()
			return instance:IsA(className)
		end)
		if ok and isA then
			for _, propertyName in props do
				addUnique(names, seen, propertyName)
			end
		end
	end

	return names
end

function Properties.serialize(instance)
	local result = {}
	for _, propertyName in getPropertyNames(instance) do
		local ok, value = pcall(function()
			return instance[propertyName]
		end)
		if ok then
			local serialized = Properties.serializeValue(value)
			if serialized then
				result[propertyName] = serialized
			end
		end
	end
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
		local enumType = tostring(value.EnumType):gsub("^Enum%.", "")
		return { type = "Enum", value = value.Value, enumType = enumType }
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

	if t == "Enum" and propData.enumType then
		local enum = Enum[propData.enumType]
		if enum then
			for _, item in enum:GetEnumItems() do
				if item.Value == v then
					return item
				end
			end
		end
	end

	return nil
end

return Properties
