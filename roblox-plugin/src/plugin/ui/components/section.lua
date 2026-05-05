local Theme = require(script.Parent.Parent.Parent.theme)

local Section = {}

function Section.create(props)
	local frame = Instance.new("Frame")
	frame.Name = props.name or "Section"
	frame.Size = props.size or UDim2.new(1, 0, 0, 0)
	frame.AutomaticSize = Enum.AutomaticSize.Y
	frame.BackgroundColor3 = Theme.Colors.Glass
	frame.BackgroundTransparency = 0.22
	frame.BorderSizePixel = 0

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, Theme.Size.BorderRadius)
	corner.Parent = frame

	local stroke = Instance.new("UIStroke")
	stroke.Color = Theme.Colors.Border
	stroke.Transparency = 0.62
	stroke.Thickness = 1
	stroke.Parent = frame

	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, Theme.Size.Padding)
	padding.PaddingBottom = UDim.new(0, Theme.Size.Padding)
	padding.PaddingLeft = UDim.new(0, Theme.Size.Padding)
	padding.PaddingRight = UDim.new(0, Theme.Size.Padding)
	padding.Parent = frame

	local header = Instance.new("TextLabel")
	header.Name = "Header"
	header.Size = UDim2.new(1, 0, 0, 24)
	header.BackgroundTransparency = 1
	header.Font = Theme.Font.Bold
	header.TextSize = Theme.Size.TextSmall
	header.TextColor3 = Theme.Colors.AccentYellow
	header.TextXAlignment = Enum.TextXAlignment.Left
	header.Text = string.upper(props.title or "SECTION")
	header.Parent = frame

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.Size = UDim2.new(1, 0, 0, 0)
	content.Position = UDim2.new(0, 0, 0, 26)
	content.AutomaticSize = Enum.AutomaticSize.Y
	content.BackgroundTransparency = 1
	content.Parent = frame

	local layout = Instance.new("UIListLayout")
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, 4)
	layout.Parent = content

	if props.parent then
		frame.Parent = props.parent
	end

	return {
		frame = frame,
		content = content,
	}
end

return Section
