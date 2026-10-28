local Theme = require(script.Parent.Parent.Parent.theme)

local Button = {}

function Button.create(props)
	local btn = Instance.new("TextButton")
	btn.Name = props.name or "Button"
	btn.Size = props.size or UDim2.new(1, 0, 0, Theme.Size.RowHeight)
	btn.BackgroundColor3 = props.color or Theme.Colors.AccentYellow
	btn.BackgroundTransparency = props.transparency or 0
	btn.TextColor3 = props.textColor or Theme.Colors.Background
	btn.Font = Theme.Font.Bold
	btn.TextSize = props.textSize or Theme.Size.TextNormal
	btn.Text = props.text or "Button"
	btn.TextWrapped = props.textWrapped ~= false
	btn.TextTruncate = Enum.TextTruncate.AtEnd
	btn.BorderSizePixel = 0
	btn.AutoButtonColor = true

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, Theme.Size.BorderRadius)
	corner.Parent = btn

	local stroke = Instance.new("UIStroke")
	stroke.Color = props.strokeColor or Theme.Colors.Border
	stroke.Transparency = props.strokeTransparency or 0.35
	stroke.Thickness = 1
	stroke.Parent = btn

	btn.MouseEnter:Connect(function()
		btn.BackgroundTransparency = props.hoverTransparency or 0.08
	end)

	btn.MouseLeave:Connect(function()
		btn.BackgroundTransparency = props.transparency or 0
	end)

	if props.onClick then
		btn.MouseButton1Click:Connect(props.onClick)
	end

	if props.parent then
		btn.Parent = props.parent
	end

	return btn
end

return Button
