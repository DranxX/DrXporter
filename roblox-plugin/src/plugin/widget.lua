local Constants = require(script.Parent.constants)

local Widget = {}

function Widget.create(plugin)
	local widgetInfo = DockWidgetPluginGuiInfo.new(
		Enum.InitialDockState.Right,
		false,
		false,
		320,
		600,
		280,
		400
	)

	local widget = plugin:CreateDockWidgetPluginGui(
		Constants.PLUGIN_NAME .. "Widget",
		widgetInfo
	)
	widget.Title = Constants.PLUGIN_NAME
	widget.Name = Constants.PLUGIN_NAME

	return widget
end

return Widget
