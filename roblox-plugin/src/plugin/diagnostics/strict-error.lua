local ErrorCodes = require(script.Parent["error-codes"])
local Logger = require(script.Parent.Parent.logger)

local StrictError = {}

function StrictError.throw(code, message, source)
	local entry = {
		code = code,
		severity = "fatal",
		message = message,
		source = source or "unknown",
	}

	Logger.fatal(string.format("[%s] %s (source: %s)", code, message, entry.source))
end

function StrictError.assert(condition, code, message, source)
	if not condition then
		StrictError.throw(code, message, source)
	end
end

function StrictError.assertUuid(uuid, instanceName)
	StrictError.assert(
		uuid and #uuid > 0,
		ErrorCodes.MISSING_UUID,
		"Missing drxporter-uuid on " .. (instanceName or "unknown"),
		"strict-error"
	)
end

function StrictError.assertNoDuplicate(uuid, existingMap)
	if existingMap[uuid] then
		StrictError.throw(
			ErrorCodes.DUPLICATE_UUID,
			"Duplicate UUID detected: " .. uuid,
			"strict-error"
		)
	end
end

return StrictError
