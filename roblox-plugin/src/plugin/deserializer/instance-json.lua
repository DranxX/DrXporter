local HttpService = game:GetService("HttpService")
local Logger = require(script.Parent.Parent.logger)

local InstanceJsonDeserializer = {}

function InstanceJsonDeserializer.fromJson(jsonString)
	local success, data = pcall(function()
		return HttpService:JSONDecode(jsonString)
	end)

	if not success then
		Logger.error("Failed to decode instance JSON: " .. tostring(data))
		return nil
	end

	if not data.uuid or not data.className or not data.name then
		Logger.error("Invalid instance JSON: missing required fields")
		return nil
	end

	return {
		uuid = data.uuid,
		className = data.className,
		name = data.name,
		properties = data.properties or {},
		attributes = data.attributes or {},
		tags = data.tags or {},
		children = data.children or {},
	}
end

function InstanceJsonDeserializer.fromTable(data)
	if not data or type(data) ~= "table" then return nil end
	if not data.uuid or not data.className then return nil end

	return {
		uuid = data.uuid,
		className = data.className,
		name = data.name or "",
		properties = data.properties or {},
		attributes = data.attributes or {},
		tags = data.tags or {},
		children = data.children or {},
	}
end

return InstanceJsonDeserializer
