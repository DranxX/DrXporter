local Theme = require(script.Parent.Parent.Parent.theme)

local Section = {}

function Section.create(props)
	local frame = Instance.new("Frame")
	frame.Name = props.name or "Section"
	frame.Size = props.size or UDim2.new(1, 0, 0, 0)
	frame.AutomaticSize = Enum.AutomaticSize.Y
	frame.BackgroundTransparency = 1
	frame.BorderSizePixel = 0

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
	content.Position = UDim2.new(0, 0, 0, 24)
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
