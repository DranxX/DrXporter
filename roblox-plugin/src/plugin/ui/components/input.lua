local Theme = require(script.Parent.Parent.Parent.theme)

local Input = {}

function Input.create(props)
	local frame = Instance.new("Frame")
	frame.Name = props.name or "Input"
	frame.Size = props.size or UDim2.new(1, 0, 0, 32)
	frame.BackgroundColor3 = Theme.Colors.GlassSoft
	frame.BackgroundTransparency = 0.18
	frame.BorderSizePixel = 0

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, Theme.Size.BorderRadius)
	corner.Parent = frame

	local stroke = Instance.new("UIStroke")
	stroke.Color = Theme.Colors.Border
	stroke.Transparency = 0.66
	stroke.Thickness = 1
	stroke.Parent = frame

	local textBox = Instance.new("TextBox")
	textBox.Name = "TextBox"
	textBox.Size = UDim2.new(1, -16, 1, 0)
	textBox.Position = UDim2.new(0, 8, 0, 0)
	textBox.BackgroundTransparency = 1
	textBox.Font = Theme.Font.Mono
	textBox.TextSize = Theme.Size.TextNormal
	textBox.TextColor3 = Theme.Colors.Text
	textBox.PlaceholderText = props.placeholder or ""
	textBox.PlaceholderColor3 = Theme.Colors.TextMuted
	textBox.Text = props.defaultValue or ""
	textBox.TextXAlignment = Enum.TextXAlignment.Left
	textBox.ClearTextOnFocus = false
	textBox.Parent = frame

	if props.onChanged then
		textBox.FocusLost:Connect(function()
			props.onChanged(textBox.Text)
		end)
	end

	if props.parent then
		frame.Parent = props.parent
	end

	return {
		frame = frame,
		getText = function() return textBox.Text end,
		setText = function(text) textBox.Text = text end,
	}
end

return Input
