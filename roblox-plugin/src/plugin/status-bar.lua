local State = require(script.Parent.state)
local Theme = require(script.Parent.theme)

local StatusBar = {}

function StatusBar.render(parent)
	local frame = Instance.new("Frame")
	frame.Name = "StatusBar"
	frame.Size = UDim2.new(1, 0, 0, 28)
	frame.AnchorPoint = Vector2.new(0, 1)
	frame.Position = UDim2.new(0, 0, 1, 0)
	frame.BackgroundColor3 = Theme.Colors.Surface
	frame.BorderSizePixel = 0
	frame.Parent = parent

	local statusLabel = Instance.new("TextLabel")
	statusLabel.Name = "StatusLabel"
	statusLabel.Size = UDim2.new(1, -16, 1, 0)
	statusLabel.Position = UDim2.new(0, 8, 0, 0)
	statusLabel.BackgroundTransparency = 1
	statusLabel.Font = Theme.Font.Default
	statusLabel.TextSize = Theme.Size.TextSmall
	statusLabel.TextColor3 = Theme.Colors.TextMuted
	statusLabel.TextXAlignment = Enum.TextXAlignment.Left
	statusLabel.Text = "Disconnected"
	statusLabel.Parent = frame

	return {
		frame = frame,
		update = function(text, color)
			statusLabel.Text = text
			statusLabel.TextColor3 = color or Theme.Colors.TextMuted
		end,
	}
end

return StatusBar
