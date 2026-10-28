local State = require(script.Parent.Parent.state)
local Logger = require(script.Parent.Parent.logger)

local Reporter = {}

function Reporter.report(entry)
	State.addDiagnostic(entry)

	local prefix = string.format("[%s] [%s]", entry.code, string.upper(entry.severity))

	if entry.severity == "fatal" or entry.severity == "error" then
		Logger.error(prefix .. " " .. entry.message)
	elseif entry.severity == "warning" then
		Logger.warn(prefix .. " " .. entry.message)
	else
		Logger.info(prefix .. " " .. entry.message)
	end
end

function Reporter.reportBatch(entries)
	for _, entry in entries do
		Reporter.report(entry)
	end
end

function Reporter.clear()
	State.clearDiagnostics()
end

function Reporter.getAll()
	return State.getDiagnostics()
end

function Reporter.hasErrors()
	local diagnostics = State.getDiagnostics()
	for _, diag in diagnostics do
		if diag.severity == "fatal" or diag.severity == "error" then
			return true
		end
	end
	return false
end

return Reporter
