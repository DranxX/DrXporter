local Constants = require(script.Parent.constants)
local UuidService = require(script.Parent["uuid-service"])
local Logger = require(script.Parent.logger)

local ValidationService = {}

function ValidationService.validateInstance(instance)
	local errors = {}

	local uuid = UuidService.getUuid(instance)
	if not uuid then
		table.insert(errors, {
			code = "DRX_E001",
			severity = "fatal",
			message = "Missing " .. Constants.UUID_ATTRIBUTE .. " on " .. instance:GetFullName(),
			source = "validation-service",
		})
		return { valid = false, errors = errors }
	end

	if #uuid == 0 then
		table.insert(errors, {
			code = "DRX_E001",
			severity = "fatal",
			message = "Empty UUID on " .. instance:GetFullName(),
			source = "validation-service",
		})
	end

	return { valid = #errors == 0, errors = errors }
end

function ValidationService.validateTree(root)
	local allErrors = {}

	local function traverse(inst)
		local result = ValidationService.validateInstance(inst)
		for _, err in result.errors do
			table.insert(allErrors, err)
		end
		for _, child in inst:GetChildren() do
			traverse(child)
		end
	end

	traverse(root)
	return { valid = #allErrors == 0, errors = allErrors }
end

function ValidationService.validatePayload(payload)
	local errors = {}

	if not payload then
		table.insert(errors, {
			code = "DRX_E012",
			severity = "fatal",
			message = "Payload is nil",
			source = "validation-service",
		})
		return { valid = false, errors = errors }
	end

	if not payload.instances and not payload.scripts then
		table.insert(errors, {
			code = "DRX_E012",
			severity = "fatal",
			message = "Payload has no instances or scripts",
			source = "validation-service",
		})
	end

	return { valid = #errors == 0, errors = errors }
end

return ValidationService
