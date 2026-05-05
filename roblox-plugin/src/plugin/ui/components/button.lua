local Theme = require(script.Parent.Parent.Parent.theme)

local Button = {}

function Button.create(props)
	local btn = Instance.new("TextButton")
	btn.Name = props.name or "Button"
	btn.Size = props.size or UDim2.new(1, 0, 0, 32)
	btn.BackgroundColor3 = props.color or Theme.Colors.AccentYellow
	btn.BackgroundTransparency = props.transparency or 0.08
	btn.TextColor3 = props.textColor or Theme.Colors.Background
	btn.Font = Theme.Font.Bold
	btn.TextSize = Theme.Size.TextNormal
	btn.Text = props.text or "Button"
	btn.BorderSizePixel = 0
	btn.AutoButtonColor = true

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, Theme.Size.BorderRadius)
	corner.Parent = btn

	local stroke = Instance.new("UIStroke")
	stroke.Color = Color3.new(1, 1, 1)
	stroke.Transparency = 0.78
	stroke.Thickness = 1
	stroke.Parent = btn

	local gradient = Instance.new("UIGradient")
	gradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.new(1, 1, 1)),
		ColorSequenceKeypoint.new(1, props.color or Theme.Colors.AccentYellow),
	})
	gradient.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.75),
		NumberSequenceKeypoint.new(1, 0.94),
	})
	gradient.Rotation = 90
	gradient.Parent = btn

	if props.onClick then
		btn.MouseButton1Click:Connect(props.onClick)
	end

	if props.parent then
		btn.Parent = props.parent
	end

	return btn
end

return Button
