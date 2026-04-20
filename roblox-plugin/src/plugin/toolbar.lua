local Constants = require(script.Parent.constants)

local Toolbar = {}

function Toolbar.create(plugin)
	local toolbar = plugin:CreateToolbar(Constants.PLUGIN_NAME)
	local toggleButton = toolbar:CreateButton(
		"DrXporter",
		"Toggle DrXporter panel",
		"rbxassetid://125582075973005",
		"DrXporter"
	)
	return {
		toolbar = toolbar,
		toggleButton = toggleButton,
	}
end

return Toolbar
