local Logger = {}
local State = require(script.Parent.state)

local LOG_PREFIX = "[DrXporter]"
local REPEAT_COOLDOWN = 10
local _lastLogAt = {}

local function shouldLog(level, message)
	local key = level .. "\0" .. tostring(message)
	local now = os.clock()
	local last = _lastLogAt[key]
	if last and now - last < REPEAT_COOLDOWN then
		return false
	end
	_lastLogAt[key] = now
	return true
end

function Logger.info(message)
	if State.getSetting("quietOutput") then return end
	if not shouldLog("INFO", message) then return end
	print(LOG_PREFIX, "[INFO]", message)
end

function Logger.warn(message)
	if not shouldLog("WARN", message) then return end
	warn(LOG_PREFIX, "[WARN]", message)
end

function Logger.error(message)
	if not shouldLog("ERROR", message) then return end
	warn(LOG_PREFIX, "[ERROR]", message)
end

function Logger.debug(message)
	if not State.getSetting("debugLogs") then return end
	if not shouldLog("DEBUG", message) then return end
	print(LOG_PREFIX, "[DEBUG]", message)
end

function Logger.fatal(message)
	error(LOG_PREFIX .. " [FATAL] " .. message)
end

return Logger
