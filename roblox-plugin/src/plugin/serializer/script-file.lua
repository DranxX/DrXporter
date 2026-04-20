local Constants = require(script.Parent.Parent.constants)
local UuidService = require(script.Parent.Parent["uuid-service"])

local ScriptFileSerializer = {}

function ScriptFileSerializer.serialize(instance)
	local uuid = UuidService.getUuid(instance)
	if not uuid then return nil end

	local scriptType = "module"
	if instance.ClassName == "Script" then
		scriptType = "server"
	elseif instance.ClassName == "LocalScript" then
		scriptType = "client"
	end

	return {
		uuid = uuid,
		name = instance.Name,
		scriptType = scriptType,
		source = instance.Source,
		className = instance.ClassName,
	}
end

function ScriptFileSerializer.getExtension(instance)
	return Constants.SCRIPT_CLASSES[instance.ClassName] or ".lua"
end

function ScriptFileSerializer.getFileName(instance)
	return instance.Name .. ScriptFileSerializer.getExtension(instance)
end

return ScriptFileSerializer
