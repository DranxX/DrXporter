local Theme = require(script.Parent.Parent.Parent.theme)
local Section = require(script.Parent.Parent.components.section)
local Input = require(script.Parent.Parent.components.input)
local Button = require(script.Parent.Parent.components.button)
local ConnectPanel = require(script.Parent.Parent.Parent["connect-panel"])
local Constants = require(script.Parent.Parent.Parent.constants)
local State = require(script.Parent.Parent.Parent.state)

local ConnectView = {}

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
	label.TextTruncate = props.truncate or Enum.TextTruncate.None
	label.TextWrapped = props.wrapped == true
	label.Text = props.text or ""
	label.Parent = props.parent
	return label
end

local function createInputRow(parent)
	local row = Instance.new("Frame")
	row.Name = "BridgeInputRow"
	row.Size = UDim2.new(1, 0, 0, 36)
	row.BackgroundTransparency = 1
	row.LayoutOrder = 2
	row.Parent = parent

	local layout = Instance.new("UIListLayout")
	layout.FillDirection = Enum.FillDirection.Horizontal
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, Theme.Size.PaddingSmall)
	layout.Parent = row

	local hostInput = Input.create({
		name = "HostInput",
		placeholder = "Host",
		defaultValue = Constants.DEFAULT_BRIDGE_HOST,
		size = UDim2.new(0.64, -3, 1, 0),
		parent = row,
	})
	hostInput.frame.LayoutOrder = 1

	local portInput = Input.create({
		name = "PortInput",
		placeholder = "Port",
		defaultValue = tostring(Constants.DEFAULT_BRIDGE_PORT),
		size = UDim2.new(0.36, -3, 1, 0),
		parent = row,
	})
	portInput.frame.LayoutOrder = 2

	return row, hostInput, portInput
end

function ConnectView.render(parent)
	local section = Section.create({
		name = "ConnectSection",
		title = "Bridge Connection",
		layoutOrder = 3,
		parent = parent,
	})

	local summary = Instance.new("Frame")
	summary.Name = "ConnectionSummary"
	summary.Size = UDim2.new(1, 0, 0, 58)
	summary.BackgroundColor3 = Theme.Colors.SurfaceAlt
	summary.BorderSizePixel = 0
	summary.LayoutOrder = 1
	summary.Parent = section.content
	addCorner(summary)
	addStroke(summary, 0.48)

	local dot = Instance.new("Frame")
	dot.Name = "StateDot"
	dot.Size = UDim2.new(0, 10, 0, 10)
	dot.Position = UDim2.new(0, 12, 0, 13)
	dot.BackgroundColor3 = Theme.Colors.Error
	dot.BorderSizePixel = 0
	dot.Parent = summary
	addCorner(dot, 5)

	createLabel({
		name = "BridgeLabel",
		size = UDim2.new(1, -124, 0, 20),
		position = UDim2.new(0, 30, 0, 8),
		textSize = Theme.Size.TextSmall,
		color = Theme.Colors.TextMuted,
		text = "Bridge",
		parent = summary,
	})

	local urlLabel = createLabel({
		name = "BridgeUrl",
		size = UDim2.new(1, -36, 0, 22),
		position = UDim2.new(0, 30, 0, 29),
		font = Theme.Font.Mono,
		textSize = Theme.Size.TextSmall,
		truncate = Enum.TextTruncate.AtEnd,
		text = State.getBridgeUrl(),
		parent = summary,
	})

	local badge = Instance.new("Frame")
	badge.Name = "ConnectionBadge"
	badge.Size = UDim2.new(0, 92, 0, 26)
	badge.Position = UDim2.new(1, -104, 0, 11)
	badge.BackgroundColor3 = Theme.Colors.Error
	badge.BorderSizePixel = 0
	badge.Parent = summary
	addCorner(badge, 13)

	local badgeLabel = createLabel({
		name = "BadgeLabel",
		size = UDim2.fromScale(1, 1),
		font = Theme.Font.Bold,
		textSize = Theme.Size.TextSmall,
		color = Theme.Colors.Background,
		xAlignment = Enum.TextXAlignment.Center,
		text = "Offline",
		parent = badge,
	})

	local inputRow, hostInput, portInput = createInputRow(section.content)

	local actionRow = Instance.new("Frame")
	actionRow.Name = "ConnectionActions"
	actionRow.Size = UDim2.new(1, 0, 0, Theme.Size.RowHeight)
	actionRow.BackgroundTransparency = 1
	actionRow.LayoutOrder = 3
	actionRow.Parent = section.content

	local connectBtn = Button.create({
		name = "ConnectButton",
		text = "Connect bridge",
		color = Theme.Colors.Success,
		textColor = Theme.Colors.Background,
		size = UDim2.fromScale(1, 1),
		parent = actionRow,
	})

	local disconnectBtn = Button.create({
		name = "DisconnectButton",
		text = "Disconnect",
		color = Theme.Colors.Error,
		textColor = Theme.Colors.Text,
		size = UDim2.fromScale(1, 1),
		parent = actionRow,
	})
	disconnectBtn.Visible = false

	local statusLabel = createLabel({
		name = "StatusLabel",
		size = UDim2.new(1, 0, 0, 24),
		textSize = Theme.Size.TextSmall,
		color = Theme.Colors.TextMuted,
		text = "Connect to the local bridge before syncing.",
		parent = section.content,
	})
	statusLabel.LayoutOrder = 4

	local function setConnectedUI(connected)
		inputRow.Visible = not connected
		connectBtn.Visible = not connected
		disconnectBtn.Visible = connected
		dot.BackgroundColor3 = connected and Theme.Colors.Success or Theme.Colors.Error
		badge.BackgroundColor3 = connected and Theme.Colors.Success or Theme.Colors.Error
		badgeLabel.Text = connected and "Online" or "Offline"
		urlLabel.Text = State.getBridgeUrl()
		statusLabel.Text = connected and "Auto sync is live: VSCode <-> Roblox." or "Connect to the local bridge before syncing."
		statusLabel.TextColor3 = connected and Theme.Colors.Success or Theme.Colors.TextMuted
	end

	connectBtn.MouseButton1Click:Connect(function()
		local host = hostInput.getText()
		local port = tonumber(portInput.getText()) or Constants.DEFAULT_BRIDGE_PORT
		connectBtn.Text = "Connecting..."
		statusLabel.Text = "Checking bridge..."
		statusLabel.TextColor3 = Theme.Colors.TextMuted

		local success = ConnectPanel.connect(host, port)
		if not success then
			connectBtn.Text = "Connect bridge"
			statusLabel.Text = "Connection failed. Check the VSCode bridge server."
			statusLabel.TextColor3 = Theme.Colors.Error
		end
	end)

	disconnectBtn.MouseButton1Click:Connect(function()
		setConnectedUI(false)
		ConnectPanel.disconnect()
	end)

	State.on("connectionChanged", function(connected)
		connectBtn.Text = "Connect bridge"
		setConnectedUI(connected)
	end)

	setConnectedUI(State.isConnected())

	return {
		section = section,
		hostInput = hostInput,
		portInput = portInput,
		connectButton = connectBtn,
	}
end

return ConnectView
