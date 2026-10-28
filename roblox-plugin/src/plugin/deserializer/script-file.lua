local Logger = require(script.Parent.Parent.logger)

local ScriptFileDeserializer = {}

function ScriptFileDeserializer.fromData(data)
	if not data or type(data) ~= "table" then return nil end
	if not data.uuid or not data.className then return nil end

	return {
		uuid = data.uuid,
		name = data.name or "",
		scriptType = data.scriptType or "module",
		source = data.source or "",
		className = data.className,
	}
end

function ScriptFileDeserializer.applyToInstance(instance, scriptData)
	if not instance or not scriptData then return false end

	if scriptData.source then
		local success, err = pcall(function()
			instance.Source = scriptData.source
		end)
		if not success then
			Logger.error("Failed to set source: " .. tostring(err))
			return false
		end
	end

	if scriptData.name and scriptData.name ~= instance.Name then
		instance.Name = scriptData.name
	end

	return true
end

return ScriptFileDeserializer
