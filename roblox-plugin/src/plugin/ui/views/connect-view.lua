local Theme = require(script.Parent.Parent.Parent.theme)
local Section = require(script.Parent.Parent.components.section)
local Input = require(script.Parent.Parent.components.input)
local Button = require(script.Parent.Parent.components.button)
local ConnectPanel = require(script.Parent.Parent.Parent["connect-panel"])
local Constants = require(script.Parent.Parent.Parent.constants)
local State = require(script.Parent.Parent.Parent.state)

local ConnectView = {}

function ConnectView.render(parent)
	local section = Section.create({
		name = "ConnectSection",
		title = "Bridge Connection",
		parent = parent,
	})

	local hostInput = Input.create({
		name = "HostInput",
		placeholder = "Host (127.0.0.1)",
		defaultValue = Constants.DEFAULT_BRIDGE_HOST,
		parent = section.content,
	})

	local portInput = Input.create({
		name = "PortInput",
		placeholder = "Port (34872)",
		defaultValue = tostring(Constants.DEFAULT_BRIDGE_PORT),
		parent = section.content,
	})

	local statusLabel = Instance.new("TextLabel")
	statusLabel.Name = "StatusLabel"
	statusLabel.Size = UDim2.new(1, 0, 0, 20)
	statusLabel.BackgroundTransparency = 1
	statusLabel.Font = Theme.Font.Default
	statusLabel.TextSize = Theme.Size.TextSmall
	statusLabel.TextColor3 = Theme.Colors.TextMuted
	statusLabel.TextXAlignment = Enum.TextXAlignment.Left
	statusLabel.Text = ""
	statusLabel.Visible = false
	statusLabel.Parent = section.content

	local connectBtn = Button.create({
		name = "ConnectButton",
		text = "CONNECT",
		color = Theme.Colors.AccentBlue,
		textColor = Theme.Colors.Background,
		size = UDim2.new(1, 0, 0, Theme.Size.RowHeight + 4),
		parent = section.content,
	})

	local disconnectBtn = Button.create({
		name = "DisconnectButton",
		text = "DISCONNECT",
		color = Theme.Colors.Error,
		textColor = Theme.Colors.Text,
		size = UDim2.new(1, 0, 0, Theme.Size.RowHeight + 4),
		parent = section.content,
	})
	disconnectBtn.Visible = false

	local function setConnectedUI(connected)
		if connected then
			hostInput.frame.Visible = false
			portInput.frame.Visible = false
			connectBtn.Visible = false
			disconnectBtn.Visible = true
			statusLabel.Visible = true
			statusLabel.Text = "✓ Connected to " .. State.getBridgeUrl()
			statusLabel.TextColor3 = Theme.Colors.Success
		else
			hostInput.frame.Visible = true
			portInput.frame.Visible = true
			connectBtn.Visible = true
			disconnectBtn.Visible = false
			statusLabel.Visible = false
			statusLabel.Text = ""
		end
	end

	connectBtn.MouseButton1Click:Connect(function()
		local host = hostInput.getText()
		local port = tonumber(portInput.getText()) or Constants.DEFAULT_BRIDGE_PORT
		connectBtn.Text = "CONNECTING..."
		local success = ConnectPanel.connect(host, port)
		if not success then
			connectBtn.Text = "CONNECT"
			statusLabel.Visible = true
			statusLabel.Text = "✗ Connection failed"
			statusLabel.TextColor3 = Theme.Colors.Error
		end
	end)

	disconnectBtn.MouseButton1Click:Connect(function()
		ConnectPanel.disconnect()
	end)

	State.on("connectionChanged", setConnectedUI)

	return {
		section = section,
		hostInput = hostInput,
		portInput = portInput,
		connectButton = connectBtn,
	}
end

return ConnectView
