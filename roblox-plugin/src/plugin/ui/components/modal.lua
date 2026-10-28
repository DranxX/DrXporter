local Theme = require(script.Parent.Parent.Parent.theme)

local Modal = {}

function Modal.create(props)
	local overlay = Instance.new("Frame")
	overlay.Name = "ModalOverlay"
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.BackgroundColor3 = Color3.new(0, 0, 0)
	overlay.BackgroundTransparency = 0.5
	overlay.BorderSizePixel = 0
	overlay.ZIndex = 100

	local panel = Instance.new("Frame")
	panel.Name = "ModalPanel"
	panel.Size = props.size or UDim2.new(0.85, 0, 0, 200)
	panel.AnchorPoint = Vector2.new(0.5, 0.5)
	panel.Position = UDim2.new(0.5, 0, 0.5, 0)
	panel.BackgroundColor3 = Theme.Colors.Surface
	panel.BorderSizePixel = 0
	panel.ZIndex = 101
	panel.AutomaticSize = Enum.AutomaticSize.Y
	panel.Parent = overlay

	local sizeConstraint = Instance.new("UISizeConstraint")
	sizeConstraint.MaxSize = Vector2.new(320, math.huge)
	sizeConstraint.MinSize = Vector2.new(200, 120)
	sizeConstraint.Parent = panel

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 8)
	corner.Parent = panel

	local title = Instance.new("TextLabel")
	title.Name = "Title"
	title.Size = UDim2.new(1, -16, 0, 32)
	title.Position = UDim2.new(0, 8, 0, 8)
	title.BackgroundTransparency = 1
	title.Font = Theme.Font.Bold
	title.TextSize = Theme.Size.TextLarge
	title.TextColor3 = Theme.Colors.Text
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Text = props.title or "Modal"
	title.ZIndex = 102
	title.Parent = panel

	local content = Instance.new("Frame")
	content.Name = "Content"
	content.Size = UDim2.new(1, -16, 1, -56)
	content.Position = UDim2.new(0, 8, 0, 48)
	content.BackgroundTransparency = 1
	content.ZIndex = 102
	content.Parent = panel

	if props.parent then
		overlay.Parent = props.parent
	end

	return {
		overlay = overlay,
		panel = panel,
		content = content,
		close = function()
			overlay:Destroy()
		end,
	}
end

return Modal
