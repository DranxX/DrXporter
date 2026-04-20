local Theme = require(script.Parent.Parent.Parent.theme)
local ScrollingFrame = require(script.Parent.Parent.components["scrolling-frame"])
local ExplorerView = require(script.Parent["explorer-view"])
local OptionsView = require(script.Parent["options-view"])
local ConnectView = require(script.Parent["connect-view"])
local DiagnosticsView = require(script.Parent["diagnostics-view"])

local MainView = {}

function MainView.render(parent)
	local scroll = ScrollingFrame.create({
		name = "MainScroll",
		size = UDim2.fromScale(1, 1),
		spacing = Theme.Size.Padding,
		transparent = true,
		parent = parent,
	})

	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, Theme.Size.Padding)
	padding.PaddingBottom = UDim.new(0, Theme.Size.Padding)
	padding.PaddingLeft = UDim.new(0, Theme.Size.Padding)
	padding.PaddingRight = UDim.new(0, Theme.Size.Padding)
	padding.Parent = scroll

	ConnectView.render(scroll)
	ExplorerView.render(scroll)
	OptionsView.render(scroll)
	DiagnosticsView.render(scroll)
end

return MainView
