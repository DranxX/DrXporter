local Theme = require(script.Parent.theme)
local State = require(script.Parent.state)
local MainView = require(script.Parent.ui.views["main-view"])
local StatusBar = require(script.Parent["status-bar"])

local App = {}

local _widget = nil
local _toolbar = nil

function App.mount(widget, toolbar)
	_widget = widget
	_toolbar = toolbar

	local container = Instance.new("Frame")
	container.Name = "AppContainer"
	container.Size = UDim2.fromScale(1, 1)
	container.BackgroundColor3 = Theme.Colors.Background
	container.BackgroundTransparency = 0.02
	container.BorderSizePixel = 0
	container.Parent = widget

	local contentArea = Instance.new("Frame")
	contentArea.Name = "ContentArea"
	contentArea.Size = UDim2.new(1, 0, 1, -28)
	contentArea.Position = UDim2.new(0, 0, 0, 0)
	contentArea.BackgroundTransparency = 1
	contentArea.BorderSizePixel = 0
	contentArea.ClipsDescendants = true
	contentArea.Parent = container

	MainView.render(contentArea)

	local statusBar = StatusBar.render(container)

	State.on("connectionChanged", function(connected)
		if connected then
			statusBar.update("Connected to " .. State.getBridgeUrl(), Theme.Colors.Success)
		else
			statusBar.update("Disconnected", Theme.Colors.TextMuted)
		end
	end)

	toolbar.toggleButton.Click:Connect(function()
		widget.Enabled = not widget.Enabled
	end)
end

return App
