local Theme = require(script.Parent.Parent.Parent.theme)
local State = require(script.Parent.Parent.Parent.state)
local ScrollingFrame = require(script.Parent.Parent.components["scrolling-frame"])
local ExplorerView = require(script.Parent["explorer-view"])
local OptionsView = require(script.Parent["options-view"])
local ConnectView = require(script.Parent["connect-view"])
local DiagnosticsView = require(script.Parent["diagnostics-view"])

local MainView = {}

local function addCorner(parent, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius or Theme.Size.BorderRadius)
	corner.Parent = parent
	return corner
end

local function addStroke(parent, transparency)
	local stroke = Instance.new("UIStroke")
	stroke.Color = Theme.Colors.Border
	stroke.Transparency = transparency or 0.35
	stroke.Thickness = 1
	stroke.Parent = parent
	return stroke
end

local function createLabel(props)
	local label = Instance.new("TextLabel")
	label.Name = props.name or "Label"
	label.Size = props.size or UDim2.fromScale(1, 1)
	label.Position = props.position or UDim2.new()
	label.BackgroundTransparency = 1
	label.Font = props.font or Theme.Font.Default
	label.TextSize = props.textSize or Theme.Size.TextNormal
	label.TextColor3 = props.color or Theme.Colors.Text
	label.TextXAlignment = props.xAlignment or Enum.TextXAlignment.Left
	label.TextYAlignment = props.yAlignment or Enum.TextYAlignment.Center
	label.TextWrapped = props.wrapped == true
	label.TextTruncate = props.truncate or Enum.TextTruncate.None
	label.Text = props.text or ""
	label.Parent = props.parent
	return label
end

local function createPill(parent, text, color)
	local pill = Instance.new("Frame")
	pill.Name = "StatusPill"
	pill.Size = UDim2.new(0, 114, 0, 30)
	pill.Position = UDim2.new(1, -114, 0, 2)
	pill.BackgroundColor3 = color
	pill.BorderSizePixel = 0
	pill.Parent = parent

	addCorner(pill, 15)

	local label = createLabel({
		name = "Label",
		size = UDim2.fromScale(1, 1),
		font = Theme.Font.Bold,
		textSize = Theme.Size.TextSmall,
		color = Theme.Colors.Background,
		xAlignment = Enum.TextXAlignment.Center,
		text = text,
		parent = pill,
	})

	return {
		frame = pill,
		label = label,
		update = function(nextText, nextColor)
			pill.BackgroundColor3 = nextColor
			label.Text = nextText
		end,
	}
end

local function createHeader(parent)
	local header = Instance.new("Frame")
	header.Name = "DashboardHeader"
	header.Size = UDim2.new(1, 0, 0, 76)
	header.BackgroundColor3 = Theme.Colors.Surface
	header.BorderSizePixel = 0
	header.LayoutOrder = 1
	header.Parent = parent

	addCorner(header)
	addStroke(header, 0.32)

	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, 12)
	padding.PaddingBottom = UDim.new(0, 12)
	padding.PaddingLeft = UDim.new(0, 12)
	padding.PaddingRight = UDim.new(0, 12)
	padding.Parent = header

	createLabel({
		name = "Title",
		size = UDim2.new(1, -126, 0, 26),
		font = Theme.Font.Bold,
		textSize = Theme.Size.TextLarge,
		text = "DrXporter",
		parent = header,
	})

	createLabel({
		name = "Subtitle",
		size = UDim2.new(1, -126, 0, 22),
		position = UDim2.new(0, 0, 0, 30),
		textSize = Theme.Size.TextSmall,
		color = Theme.Colors.TextMuted,
		text = "VSCode <-> Roblox sync",
		parent = header,
	})

	local pill = createPill(
		header,
		State.isConnected() and "ONLINE" or "OFFLINE",
		State.isConnected() and Theme.Colors.Success or Theme.Colors.Error
	)

	State.on("connectionChanged", function(connected)
		pill.update(connected and "ONLINE" or "OFFLINE", connected and Theme.Colors.Success or Theme.Colors.Error)
	end)
end

local function createCard(parent, layoutOrder, title, value, accentColor)
	local card = Instance.new("Frame")
	card.Name = title:gsub("%s+", "") .. "Card"
	card.Size = UDim2.new(0.5, -4, 1, 0)
	card.BackgroundColor3 = Theme.Colors.SurfaceAlt
	card.BorderSizePixel = 0
	card.LayoutOrder = layoutOrder
	card.Parent = parent

	addCorner(card, Theme.Size.BorderRadius)
	addStroke(card, 0.48)

	local accent = Instance.new("Frame")
	accent.Name = "Accent"
	accent.Size = UDim2.new(0, 4, 1, -14)
	accent.Position = UDim2.new(0, 8, 0, 7)
	accent.BackgroundColor3 = accentColor
	accent.BorderSizePixel = 0
	accent.Parent = card
	addCorner(accent, 3)

	createLabel({
		name = "Title",
		size = UDim2.new(1, -28, 0, 18),
		position = UDim2.new(0, 20, 0, 9),
		textSize = Theme.Size.TextTiny,
		color = Theme.Colors.TextMuted,
		text = title,
		parent = card,
	})

	local valueLabel = createLabel({
		name = "Value",
		size = UDim2.new(1, -28, 0, 28),
		position = UDim2.new(0, 20, 0, 31),
		font = Theme.Font.Bold,
		textSize = Theme.Size.TextNormal,
		truncate = Enum.TextTruncate.AtEnd,
		text = value,
		parent = card,
	})

	return {
		frame = card,
		accent = accent,
		value = valueLabel,
	}
end

local function createDashboardCards(parent)
	local grid = Instance.new("Frame")
	grid.Name = "StatusCards"
	grid.Size = UDim2.new(1, 0, 0, 148)
	grid.BackgroundTransparency = 1
	grid.LayoutOrder = 2
	grid.Parent = parent

	local verticalLayout = Instance.new("UIListLayout")
	verticalLayout.SortOrder = Enum.SortOrder.LayoutOrder
	verticalLayout.Padding = UDim.new(0, Theme.Size.PaddingSmall)
	verticalLayout.Parent = grid

	local rowOne = Instance.new("Frame")
	rowOne.Name = "RowOne"
	rowOne.Size = UDim2.new(1, 0, 0, 70)
	rowOne.BackgroundTransparency = 1
	rowOne.LayoutOrder = 1
	rowOne.Parent = grid

	local rowOneLayout = Instance.new("UIListLayout")
	rowOneLayout.FillDirection = Enum.FillDirection.Horizontal
	rowOneLayout.SortOrder = Enum.SortOrder.LayoutOrder
	rowOneLayout.Padding = UDim.new(0, Theme.Size.PaddingSmall)
	rowOneLayout.Parent = rowOne

	local rowTwo = Instance.new("Frame")
	rowTwo.Name = "RowTwo"
	rowTwo.Size = UDim2.new(1, 0, 0, 70)
	rowTwo.BackgroundTransparency = 1
	rowTwo.LayoutOrder = 2
	rowTwo.Parent = grid

	local rowTwoLayout = Instance.new("UIListLayout")
	rowTwoLayout.FillDirection = Enum.FillDirection.Horizontal
	rowTwoLayout.SortOrder = Enum.SortOrder.LayoutOrder
	rowTwoLayout.Padding = UDim.new(0, Theme.Size.PaddingSmall)
	rowTwoLayout.Parent = rowTwo

	local bridgeCard = createCard(rowOne, 1, "Bridge", State.isConnected() and "Online" or "Offline", Theme.Colors.AccentBlue)
	local syncCard = createCard(rowOne, 2, "Auto Sync", State.isConnected() and "Live" or "Standby", Theme.Colors.Success)
	local placeText = State.getPlaceId() ~= "" and ("Place " .. State.getPlaceId()) or "Place unknown"
	local placeCard = createCard(rowTwo, 1, "Session", placeText, Theme.Colors.AccentYellow)
	local diagnosticsCard = createCard(rowTwo, 2, "Diagnostics", tostring(#State.getDiagnostics()) .. " issues", Theme.Colors.Warning)

	State.on("connectionChanged", function(connected)
		bridgeCard.value.Text = connected and "Online" or "Offline"
		bridgeCard.accent.BackgroundColor3 = connected and Theme.Colors.Success or Theme.Colors.Error
		syncCard.value.Text = connected and "Live" or "Standby"
		syncCard.accent.BackgroundColor3 = connected and Theme.Colors.Success or Theme.Colors.TextSubtle
	end)

	State.on("diagnosticsChanged", function(diagnostics)
		local count = #diagnostics
		diagnosticsCard.value.Text = tostring(count) .. (count == 1 and " issue" or " issues")
		diagnosticsCard.accent.BackgroundColor3 = count > 0 and Theme.Colors.Warning or Theme.Colors.Success
	end)

	bridgeCard.accent.BackgroundColor3 = State.isConnected() and Theme.Colors.Success or Theme.Colors.Error
	syncCard.accent.BackgroundColor3 = State.isConnected() and Theme.Colors.Success or Theme.Colors.TextSubtle
	diagnosticsCard.accent.BackgroundColor3 = #State.getDiagnostics() > 0 and Theme.Colors.Warning or Theme.Colors.Success
	placeCard.value.Text = placeText
end

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

	createHeader(scroll)
	createDashboardCards(scroll)
	ConnectView.render(scroll)
	OptionsView.render(scroll)
	ExplorerView.render(scroll)
	DiagnosticsView.render(scroll)
end

return MainView
