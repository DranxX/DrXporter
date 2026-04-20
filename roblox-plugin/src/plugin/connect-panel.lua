local State = require(script.Parent.state)
local BridgeClient = require(script.Parent["bridge-client"])
local Logger = require(script.Parent.logger)

local ConnectPanel = {}

function ConnectPanel.connect(host, port)
	State.setBridgeAddress(host, port)
	local success, err = BridgeClient.connect()
	if success then
		State.setConnected(true)
		Logger.info("Connected to bridge at " .. State.getBridgeUrl())
		return true
	else
		State.setConnected(false)
		Logger.error("Failed to connect: " .. tostring(err))
		return false
	end
end

function ConnectPanel.disconnect()
	BridgeClient.disconnect()
	State.setConnected(false)
	Logger.info("Disconnected from bridge")
end

function ConnectPanel.isConnected()
	return State.isConnected()
end

return ConnectPanel
