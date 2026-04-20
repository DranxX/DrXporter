local HttpService = game:GetService("HttpService")
local Constants = require(script.Parent.constants)
local State = require(script.Parent.state)

local BridgeProtocol = {}

function BridgeProtocol.generateRequestId()
	return HttpService:GenerateGUID(false)
end

function BridgeProtocol.createRequest(action, payload)
	return {
		requestId = BridgeProtocol.generateRequestId(),
		action = action,
		payload = payload,
		timestamp = os.time(),
	}
end

function BridgeProtocol.createConnectPayload()
	return BridgeProtocol.createRequest("connect", {
		gameId = State.getGameId(),
		placeId = State.getPlaceId(),
		pluginVersion = Constants.PLUGIN_VERSION,
	})
end

function BridgeProtocol.createExportPayload(instances, scripts, selectedUuids, ancestorUuids)
	return BridgeProtocol.createRequest("export-push", {
		cacheKey = State.getCacheKey(),
		instances = instances,
		scripts = scripts,
		selectedUuids = selectedUuids,
		ancestorUuids = ancestorUuids,
	})
end

function BridgeProtocol.createImportPayload(requestedUuids)
	return BridgeProtocol.createRequest("import-pull", {
		cacheKey = State.getCacheKey(),
		requestedUuids = requestedUuids,
	})
end

function BridgeProtocol.parseResponse(responseBody)
	local success, decoded = pcall(function()
		return HttpService:JSONDecode(responseBody)
	end)
	if not success then return nil end
	return decoded
end

return BridgeProtocol
