local Theme = require(script.Parent.Parent.Parent.theme)

local ScrollingFrame = {}

function ScrollingFrame.create(props)
	local scroll = Instance.new("ScrollingFrame")
	scroll.Name = props.name or "ScrollingFrame"
	scroll.Size = props.size or UDim2.fromScale(1, 1)
	scroll.Position = props.position or UDim2.new()
	scroll.BackgroundColor3 = Theme.Colors.Background
	scroll.BackgroundTransparency = props.transparent and 1 or 0
	scroll.BorderSizePixel = 0
	scroll.ScrollBarThickness = 4
	scroll.ScrollBarImageColor3 = Theme.Colors.Border
	scroll.CanvasSize = UDim2.new(0, 0, 0, 0)
	scroll.AutomaticCanvasSize = Enum.AutomaticSize.Y

	if props.autoSize then
		scroll.AutomaticSize = Enum.AutomaticSize.Y
	end

	local layout = Instance.new("UIListLayout")
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, props.spacing or 0)
	layout.Parent = scroll

	if props.maxHeight then
		local maxH = props.maxHeight
		scroll.AutomaticSize = Enum.AutomaticSize.None

		local sizeConstraint = Instance.new("UISizeConstraint")
		sizeConstraint.MaxSize = Vector2.new(math.huge, maxH)
		sizeConstraint.Parent = scroll

		local function updateSize()
			local contentHeight = layout.AbsoluteContentSize.Y
			if contentHeight > maxH then
				scroll.Size = UDim2.new(1, 0, 0, maxH)
			else
				scroll.Size = UDim2.new(1, 0, 0, contentHeight)
			end
		end

		layout:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(updateSize)
		task.defer(updateSize)
	end

	if props.parent then
		scroll.Parent = props.parent
	end

	return scroll
end

return ScrollingFrame
