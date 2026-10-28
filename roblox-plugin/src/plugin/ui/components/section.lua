local Theme = require(script.Parent.Parent.Parent.theme)

local Section = {}

function Section.create(props)
	local frame = Instance.new("Frame")
	frame.Name = props.name or "Section"
	frame.Size = props.size or UDim2.new(1, 0, 0, 0)
	frame.AutomaticSize = Enum.AutomaticSize.Y
	frame.BackgroundColor3 = props.color or Theme.Colors.Surface
	frame.BackgroundTransparency = props.transparency or 0
	frame.BorderSizePixel = 0
	frame.LayoutOrder = props.layoutOrder or frame.LayoutOrder

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, props.radius or Theme.Size.BorderRadius)
	corner.Parent = frame

	local stroke = Instance.new("UIStroke")
	stroke.Color = props.borderColor or Theme.Colors.Border
	stroke.Transparency = props.borderTransparency or 0.32
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
	header.Size = UDim2.new(1, 0, 0, 26)
	header.BackgroundTransparency = 1
	header.Font = Theme.Font.Bold
	header.TextSize = Theme.Size.TextNormal
	header.TextColor3 = props.titleColor or Theme.Colors.Text
	header.TextXAlignment = Enum.TextXAlignment.Left
	header.Text = props.title or "Section"
	header.Parent = frame

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.Size = UDim2.new(1, 0, 0, 0)
	content.Position = UDim2.new(0, 0, 0, 30)
	content.AutomaticSize = Enum.AutomaticSize.Y
	content.BackgroundTransparency = 1
	content.Parent = frame

	local layout = Instance.new("UIListLayout")
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, props.spacing or Theme.Size.PaddingSmall)
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
