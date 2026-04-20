local Theme = require(script.Parent.Parent.Parent.theme)

local Checkbox = {}

function Checkbox.create(props)
	local frame = Instance.new("Frame")
	frame.Name = props.name or "Checkbox"
	frame.Size = UDim2.new(1, 0, 0, Theme.Size.RowHeight)
	frame.BackgroundTransparency = 1
	frame.Parent = props.parent

	local box = Instance.new("TextButton")
	box.Name = "Box"
	box.Size = UDim2.new(0, 16, 0, 16)
	box.Position = UDim2.new(0, 0, 0.5, -8)
	box.BackgroundColor3 = Theme.Colors.Surface
	box.BorderSizePixel = 1
	box.BorderColor3 = Theme.Colors.Border
	box.Text = ""
	box.Parent = frame

	local checkMark = Instance.new("TextLabel")
	checkMark.Name = "Check"
	checkMark.Size = UDim2.fromScale(1, 1)
	checkMark.BackgroundTransparency = 1
	checkMark.Font = Theme.Font.Bold
	checkMark.TextSize = 12
	checkMark.TextColor3 = Theme.Colors.AccentYellow
	checkMark.Text = ""
	checkMark.Parent = box

	local label = Instance.new("TextLabel")
	label.Name = "Label"
	label.Size = UDim2.new(1, -24, 1, 0)
	label.Position = UDim2.new(0, 24, 0, 0)
	label.BackgroundTransparency = 1
	label.Font = Theme.Font.Default
	label.TextSize = Theme.Size.TextNormal
	label.TextColor3 = Theme.Colors.Text
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.Text = props.label or ""
	label.Parent = frame

	local checked = props.checked or false

	local function updateVisual()
		checkMark.Text = checked and "✓" or ""
	end

	box.MouseButton1Click:Connect(function()
		checked = not checked
		updateVisual()
		if props.onToggle then
			props.onToggle(checked)
		end
	end)

	updateVisual()

	return {
		frame = frame,
		isChecked = function() return checked end,
		setChecked = function(val)
			checked = val
			updateVisual()
		end,
	}
end

return Checkbox
