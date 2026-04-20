local Theme = require(script.Parent.Parent.Parent.theme)
local Section = require(script.Parent.Parent.components.section)
local ScrollingFrame = require(script.Parent.Parent.components["scrolling-frame"])
local State = require(script.Parent.Parent.Parent.state)

local DiagnosticsView = {}

function DiagnosticsView.render(parent)
	local section = Section.create({
		name = "DiagnosticsSection",
		title = "Diagnostics",
		parent = parent,
	})

	local scroll = ScrollingFrame.create({
		name = "DiagnosticsScroll",
		size = UDim2.new(1, 0, 0, 0),
		autoSize = true,
		maxHeight = 200,
		spacing = 2,
		parent = section.content,
	})

	local emptyLabel = Instance.new("TextLabel")
	emptyLabel.Name = "EmptyLabel"
	emptyLabel.Size = UDim2.new(1, 0, 0, 24)
	emptyLabel.BackgroundTransparency = 1
	emptyLabel.Font = Theme.Font.Default
	emptyLabel.TextSize = Theme.Size.TextSmall
	emptyLabel.TextColor3 = Theme.Colors.TextMuted
	emptyLabel.TextXAlignment = Enum.TextXAlignment.Left
	emptyLabel.Text = "No diagnostics"
	emptyLabel.Parent = scroll

	local function refresh()
		for _, child in scroll:GetChildren() do
			if child:IsA("Frame") then
				child:Destroy()
			end
		end

		local diagnostics = State.getDiagnostics()

		if #diagnostics == 0 then
			emptyLabel.Visible = true
			return
		end

		emptyLabel.Visible = false

		for i, diag in diagnostics do
			local entry = Instance.new("Frame")
			entry.Name = "Diag_" .. i
			entry.Size = UDim2.new(1, 0, 0, 24)
			entry.BackgroundTransparency = 1
			entry.LayoutOrder = i
			entry.Parent = scroll

			local severityColor = Theme.Colors.Text
			if diag.severity == "fatal" or diag.severity == "error" then
				severityColor = Theme.Colors.Error
			elseif diag.severity == "warning" then
				severityColor = Theme.Colors.Warning
			end

			local label = Instance.new("TextLabel")
			label.Size = UDim2.fromScale(1, 1)
			label.BackgroundTransparency = 1
			label.Font = Theme.Font.Mono
			label.TextSize = Theme.Size.TextSmall
			label.TextColor3 = severityColor
			label.TextXAlignment = Enum.TextXAlignment.Left
			label.Text = string.format("[%s] %s: %s", diag.code, diag.severity, diag.message)
			label.TextTruncate = Enum.TextTruncate.AtEnd
			label.Parent = entry
		end
	end

	State.on("diagnosticsChanged", function()
		refresh()
	end)

	return {
		section = section,
		scroll = scroll,
		refresh = refresh,
	}
end

return DiagnosticsView
