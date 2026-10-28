local State = {}

local _plugin = nil
local _connected = false
local _bridgeHost = "127.0.0.1"
local _bridgePort = 51234
local _gameId = ""
local _placeId = ""
local _selectedUuids = {}
local _ancestorUuids = {}
local _diagnostics = {}
local _listeners = {}
local _settings = {
	quietOutput = true,
	debugLogs = false,
}

local MAX_DIAGNOSTICS = 100
local SETTING_PREFIX = "DrXporter."

local function loadPluginSetting(key, defaultValue)
	if not _plugin then return defaultValue end

	local ok, value = pcall(function()
		return _plugin:GetSetting(SETTING_PREFIX .. key)
	end)
	if ok and typeof(value) == typeof(defaultValue) then
		return value
	end
	return defaultValue
end

local function savePluginSetting(key, value)
	if not _plugin then return end
	pcall(function()
		_plugin:SetSetting(SETTING_PREFIX .. key, value)
	end)
end

local function loadSettings()
	for key, defaultValue in _settings do
		_settings[key] = loadPluginSetting(key, defaultValue)
	end
end

function State.on(event, callback)
	if not _listeners[event] then
		_listeners[event] = {}
	end
	table.insert(_listeners[event], callback)
	return #_listeners[event]
end

function State.off(event, index)
	if _listeners[event] and _listeners[event][index] then
		_listeners[event][index] = nil
	end
end

function State.clearListeners(event)
	if event then
		_listeners[event] = {}
	else
		_listeners = {}
	end
end

function State._fire(event, ...)
	if not _listeners[event] then return end
	for _, cb in _listeners[event] do
		if cb then
			task.spawn(cb, ...)
		end
	end
end

function State.setPlugin(plugin)
	_plugin = plugin
	_gameId = tostring(game.GameId)
	_placeId = tostring(game.PlaceId)
	loadSettings()
	State._fire("settingsChanged", _settings)
end

function State.getPlugin()
	return _plugin
end

function State.isConnected()
	return _connected
end

function State.setConnected(value)
	_connected = value
	State._fire("connectionChanged", value)
end

function State.getBridgeUrl()
	return string.format("http://%s:%d", _bridgeHost, _bridgePort)
end

function State.setBridgeAddress(host, port)
	_bridgeHost = host
	_bridgePort = port
end

function State.getGameId()
	return _gameId
end

function State.getPlaceId()
	return _placeId
end

function State.getCacheKey()
	return { gameId = _gameId, placeId = _placeId }
end

function State.getSetting(key)
	return _settings[key]
end

function State.setSetting(key, value)
	if _settings[key] == value then return end
	_settings[key] = value
	savePluginSetting(key, value)
	State._fire("settingChanged", key, value)
	State._fire("settingsChanged", _settings)
end

function State.getSelectedUuids()
	return _selectedUuids
end

function State.setSelectedUuids(uuids)
	_selectedUuids = uuids
	State._fire("selectionChanged", uuids)
end

function State.getAncestorUuids()
	return _ancestorUuids
end

function State.setAncestorUuids(uuids)
	_ancestorUuids = uuids
end

function State.getDiagnostics()
	return _diagnostics
end

function State.addDiagnostic(entry)
	table.insert(_diagnostics, entry)
	if #_diagnostics > MAX_DIAGNOSTICS then
		table.remove(_diagnostics, 1)
	end
	State._fire("diagnosticsChanged", _diagnostics)
end

function State.clearDiagnostics()
	_diagnostics = {}
	State._fire("diagnosticsChanged", _diagnostics)
end

return State
