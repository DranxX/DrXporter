local Logger = {}

local LOG_PREFIX = "[DrXporter]"

function Logger.info(message)
	print(LOG_PREFIX, "[INFO]", message)
end

function Logger.warn(message)
	warn(LOG_PREFIX, "[WARN]", message)
end

function Logger.error(message)
	warn(LOG_PREFIX, "[ERROR]", message)
end

function Logger.debug(message)
	print(LOG_PREFIX, "[DEBUG]", message)
end

function Logger.fatal(message)
	error(LOG_PREFIX .. " [FATAL] " .. message)
end

return Logger
