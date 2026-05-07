local Theme = require(script.Parent.Parent.Parent.theme)
local Section = require(script.Parent.Parent.components.section)
local ScrollingFrame = require(script.Parent.Parent.components["scrolling-frame"])
local State = require(script.Parent.Parent.Parent.state)

local DiagnosticsView = {}

local function addCorner(parent, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius or Theme.Size.BorderRadius)
	corner.Parent = parent
	return corner
end

local function addStroke(parent, transparency)
	local stroke = Instance.new("UIStroke")
	stroke.Color = Theme.Colors.Border
	stroke.Transparency = transparency or 0.5
	stroke.Thickness = 1
	stroke.Parent = parent
	return stroke
end

local function severityColor(severity)
	if severity == "fatal" or severity == "error" then
		return Theme.Colors.Error
	elseif severity == "warning" then
		return Theme.Colors.Warning
	end
	return Theme.Colors.TextMuted
end

function DiagnosticsView.render(parent)
	local section = Section.create({
		name = "DiagnosticsSection",
		title = "Diagnostics",
		layoutOrder = 7,
		parent = parent,
	})

	local summary = Instance.new("Frame")
	summary.Name = "DiagnosticsSummary"
	summary.Size = UDim2.new(1, 0, 0, 40)
	summary.BackgroundColor3 = Theme.Colors.SurfaceAlt
	summary.BorderSizePixel = 0
	summary.LayoutOrder = 1
	summary.Parent = section.content
	addCorner(summary)
	addStroke(summary, 0.5)

	local summaryAccent = Instance.new("Frame")
	summaryAccent.Name = "Accent"
	summaryAccent.Size = UDim2.new(0, 4, 1, -14)
	summaryAccent.Position = UDim2.new(0, 9, 0, 7)
	summaryAccent.BackgroundColor3 = Theme.Colors.Success
	summaryAccent.BorderSizePixel = 0
	summaryAccent.Parent = summary
	addCorner(summaryAccent, 3)

	local summaryLabel = Instance.new("TextLabel")
	summaryLabel.Name = "SummaryLabel"
	summaryLabel.Size = UDim2.new(1, -28, 1, 0)
	summaryLabel.Position = UDim2.new(0, 22, 0, 0)
	summaryLabel.BackgroundTransparency = 1
	summaryLabel.Font = Theme.Font.Bold
	summaryLabel.TextSize = Theme.Size.TextSmall
	summaryLabel.TextColor3 = Theme.Colors.Text
	summaryLabel.TextXAlignment = Enum.TextXAlignment.Left
	summaryLabel.Text = "No diagnostics"
	summaryLabel.Parent = summary

	local scroll = ScrollingFrame.create({
		name = "DiagnosticsScroll",
		size = UDim2.new(1, 0, 0, 0),
		autoSize = true,
		maxHeight = 190,
		spacing = Theme.Size.PaddingSmall,
		parent = section.content,
	})
	scroll.BackgroundColor3 = Theme.Colors.GlassSoft
	scroll.LayoutOrder = 2
	addCorner(scroll)
	addStroke(scroll, 0.55)

	local scrollPadding = Instance.new("UIPadding")
	scrollPadding.PaddingTop = UDim.new(0, Theme.Size.PaddingSmall)
	scrollPadding.PaddingBottom = UDim.new(0, Theme.Size.PaddingSmall)
	scrollPadding.PaddingLeft = UDim.new(0, Theme.Size.PaddingSmall)
	scrollPadding.PaddingRight = UDim.new(0, Theme.Size.PaddingSmall)
	scrollPadding.Parent = scroll

	local emptyLabel = Instance.new("TextLabel")
	emptyLabel.Name = "EmptyLabel"
	emptyLabel.Size = UDim2.new(1, 0, 0, 34)
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
		local count = #diagnostics
		summaryLabel.Text = count == 0 and "No diagnostics" or (tostring(count) .. " diagnostics")
		summaryAccent.BackgroundColor3 = count == 0 and Theme.Colors.Success or Theme.Colors.Warning

		if count == 0 then
			emptyLabel.Visible = true
			return
		end

		emptyLabel.Visible = false

		for i, diag in diagnostics do
			local entry = Instance.new("Frame")
			entry.Name = "Diag_" .. i
			entry.Size = UDim2.new(1, 0, 0, 52)
			entry.BackgroundColor3 = Theme.Colors.SurfaceAlt
			entry.BorderSizePixel = 0
			entry.LayoutOrder = i
			entry.Parent = scroll
			addCorner(entry, 6)
			addStroke(entry, 0.68)

			local color = severityColor(diag.severity)

			local codeLabel = Instance.new("TextLabel")
			codeLabel.Name = "Code"
			codeLabel.Size = UDim2.new(1, -16, 0, 18)
			codeLabel.Position = UDim2.new(0, 8, 0, 6)
			codeLabel.BackgroundTransparency = 1
			codeLabel.Font = Theme.Font.Mono
			codeLabel.TextSize = Theme.Size.TextTiny
			codeLabel.TextColor3 = color
			codeLabel.TextXAlignment = Enum.TextXAlignment.Left
			codeLabel.Text = string.format("%s / %s", tostring(diag.code), tostring(diag.severity))
			codeLabel.TextTruncate = Enum.TextTruncate.AtEnd
			codeLabel.Parent = entry

			local messageLabel = Instance.new("TextLabel")
			messageLabel.Name = "Message"
			messageLabel.Size = UDim2.new(1, -16, 0, 22)
			messageLabel.Position = UDim2.new(0, 8, 0, 25)
			messageLabel.BackgroundTransparency = 1
			messageLabel.Font = Theme.Font.Default
			messageLabel.TextSize = Theme.Size.TextSmall
			messageLabel.TextColor3 = Theme.Colors.Text
			messageLabel.TextXAlignment = Enum.TextXAlignment.Left
			messageLabel.Text = tostring(diag.message)
			messageLabel.TextTruncate = Enum.TextTruncate.AtEnd
			messageLabel.Parent = entry
		end
	end

	State.on("diagnosticsChanged", function()
		refresh()
	end)

	refresh()

	return {
		section = section,
		scroll = scroll,
		refresh = refresh,
	}
end

return DiagnosticsView
