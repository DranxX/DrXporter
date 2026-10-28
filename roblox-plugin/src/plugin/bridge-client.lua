local HttpService = game:GetService("HttpService")
local State = require(script.Parent.state)
local BridgeProtocol = require(script.Parent["bridge-protocol"])
local Logger = require(script.Parent.logger)

local BridgeClient = {}

local function getResponseError(response)
	local fallback = "HTTP " .. tostring(response and response.StatusCode or "unknown")
	if not response or not response.Body or response.Body == "" then
		return fallback
	end

	local decodeOk, decoded = pcall(function()
		return HttpService:JSONDecode(response.Body)
	end)
	if not decodeOk or not decoded then
		return fallback
	end

	if decoded.error and decoded.error.message then
		return fallback .. ": " .. tostring(decoded.error.message)
	end
	if decoded.message then
		return fallback .. ": " .. tostring(decoded.message)
	end
	if decoded.error then
		return fallback .. ": " .. tostring(decoded.error)
	end
	return fallback
end

function BridgeClient.connect()
	local url = State.getBridgeUrl() .. "/connect"
	local payload = BridgeProtocol.createConnectPayload()

	local success, response = pcall(function()
		return HttpService:RequestAsync({
			Url = url,
			Method = "POST",
			Headers = { ["Content-Type"] = "application/json" },
			Body = HttpService:JSONEncode(payload),
		})
	end)

	if not success then
		return false, response
	end

	if response.StatusCode ~= 200 then
		return false, getResponseError(response)
	end

	return true, nil
end

function BridgeClient.disconnect()
	local url = State.getBridgeUrl() .. "/disconnect"
	pcall(function()
		HttpService:RequestAsync({
			Url = url,
			Method = "POST",
			Headers = { ["Content-Type"] = "application/json" },
			Body = "{}",
		})
	end)
end

function BridgeClient.request(action, payload)
	local url = State.getBridgeUrl() .. "/" .. action
	local body = BridgeProtocol.createRequest(action, payload)

	local success, response = pcall(function()
		return HttpService:RequestAsync({
			Url = url,
			Method = "POST",
			Headers = { ["Content-Type"] = "application/json" },
			Body = HttpService:JSONEncode(body),
		})
	end)

	if not success then
		Logger.error("Bridge request failed: " .. tostring(response))
		return nil, response
	end

	if response.StatusCode ~= 200 then
		local err = getResponseError(response)
		Logger.error("Bridge returned " .. err)
		return nil, err
	end

	local decodeOk, decoded = pcall(function()
		return HttpService:JSONDecode(response.Body)
	end)

	if not decodeOk then
		Logger.error("Failed to decode response: " .. tostring(decoded))
		return nil, "JSON decode failed"
	end

	return decoded, nil
end

function BridgeClient.health()
	local url = State.getBridgeUrl() .. "/health"
	local success, response = pcall(function()
		return HttpService:RequestAsync({
			Url = url,
			Method = "GET",
		})
	end)

	if not success then return false end
	return response.StatusCode == 200
end

return BridgeClient
