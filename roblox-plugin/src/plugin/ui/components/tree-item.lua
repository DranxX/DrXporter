local Theme = require(script.Parent.Parent.Parent.theme)

local TreeItem = {}

function TreeItem.create(props)
	local frame = Instance.new("Frame")
	frame.Name = "TreeItem_" .. (props.name or "")
	frame.Size = UDim2.new(1, 0, 0, Theme.Size.RowHeight)
	frame.BackgroundColor3 = Theme.Colors.Surface
	frame.BackgroundTransparency = 1
	frame.BorderSizePixel = 0

	local indent = Instance.new("Frame")
	indent.Name = "Indent"
	indent.Size = UDim2.new(0, (props.depth or 0) * 16, 1, 0)
	indent.BackgroundTransparency = 1
	indent.Parent = frame

	local icon = Instance.new("TextLabel")
	icon.Name = "Icon"
	icon.Size = UDim2.new(0, 16, 0, 16)
	icon.Position = UDim2.new(0, (props.depth or 0) * 16, 0.5, -8)
	icon.BackgroundTransparency = 1
	icon.Font = Theme.Font.Mono
	icon.TextSize = 11
	icon.TextColor3 = Theme.Colors.AccentBlue
	icon.Text = props.hasChildren and "▶" or "•"
	icon.Parent = frame

	local label = Instance.new("TextButton")
	label.Name = "Label"
	label.Size = UDim2.new(1, -((props.depth or 0) * 16 + 20), 1, 0)
	label.Position = UDim2.new(0, (props.depth or 0) * 16 + 20, 0, 0)
	label.BackgroundTransparency = 1
	label.Font = Theme.Font.Default
	label.TextSize = Theme.Size.TextNormal
	label.TextColor3 = Theme.Colors.Text
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.Text = props.name or ""
	label.BorderSizePixel = 0
	label.Parent = frame

	label.MouseButton1Click:Connect(function()
		if props.onClick then
			props.onClick()
		end
	end)

	frame.MouseEnter:Connect(function()
		frame.BackgroundTransparency = 0
		frame.BackgroundColor3 = Theme.Colors.SurfaceHover
	end)

	frame.MouseLeave:Connect(function()
		frame.BackgroundTransparency = 1
	end)

	if props.parent then
		frame.Parent = props.parent
	end

	return frame
end

return TreeItem
