local Toolbar = require(script.Parent.toolbar)
local Widget = require(script.Parent.widget)
local App = require(script.Parent.app)
local State = require(script.Parent.state)
local SelectionController = require(script.Parent["selection-controller"])
local SyncService = require(script.Parent["sync-service"])
local Logger = require(script.Parent.logger)

local Bootstrap = {}

function Bootstrap.init(plugin)
	Logger.info("DrXporter initializing...")
	State.setPlugin(plugin)

	local toolbar = Toolbar.create(plugin)
	local widget = Widget.create(plugin)

	App.mount(widget, toolbar)
	SelectionController.start()

	State.on("connectionChanged", function(connected)
		if connected then
			SyncService.startPolling()
			SyncService.requestInitialSync()
		else
			SyncService.stopPolling()
		end
	end)

	Logger.info("DrXporter initialized")
end

return Bootstrap
