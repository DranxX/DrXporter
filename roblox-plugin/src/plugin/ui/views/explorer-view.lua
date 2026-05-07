local Theme = require(script.Parent.Parent.Parent.theme)
local Section = require(script.Parent.Parent.components.section)
local ScrollingFrame = require(script.Parent.Parent.components["scrolling-frame"])
local TreeItem = require(script.Parent.Parent.components["tree-item"])
local State = require(script.Parent.Parent.Parent.state)
local Selection = game:GetService("Selection")

local ExplorerView = {}

local function addCorner(parent, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius or Theme.Size.BorderRadius)
	corner.Parent = parent
	return corner
end

local function addStroke(parent, transparency)
	local stroke = Instance.new("UIStroke")
	stroke.Color = Theme.Colors.Border
	stroke.Transparency = transparency or 0.45
	stroke.Thickness = 1
	stroke.Parent = parent
	return stroke
end

function ExplorerView.render(parent)
	local section = Section.create({
		name = "ExplorerSection",
		title = "Selection Explorer",
		layoutOrder = 6,
		parent = parent,
	})

	local summary = Instance.new("Frame")
	summary.Name = "ExplorerSummary"
	summary.Size = UDim2.new(1, 0, 0, 44)
	summary.BackgroundColor3 = Theme.Colors.SurfaceAlt
	summary.BorderSizePixel = 0
	summary.LayoutOrder = 1
	summary.Parent = section.content
	addCorner(summary)
	addStroke(summary, 0.5)

	local summaryLabel = Instance.new("TextLabel")
	summaryLabel.Name = "SummaryLabel"
	summaryLabel.Size = UDim2.new(1, -24, 0, 18)
	summaryLabel.Position = UDim2.new(0, 12, 0, 6)
	summaryLabel.BackgroundTransparency = 1
	summaryLabel.Font = Theme.Font.Bold
	summaryLabel.TextSize = Theme.Size.TextSmall
	summaryLabel.TextColor3 = Theme.Colors.Text
	summaryLabel.TextXAlignment = Enum.TextXAlignment.Left
	summaryLabel.Text = "0 selected"
	summaryLabel.Parent = summary

	local summaryHint = Instance.new("TextLabel")
	summaryHint.Name = "SummaryHint"
	summaryHint.Size = UDim2.new(1, -24, 0, 16)
	summaryHint.Position = UDim2.new(0, 12, 0, 24)
	summaryHint.BackgroundTransparency = 1
	summaryHint.Font = Theme.Font.Default
	summaryHint.TextSize = Theme.Size.TextTiny
	summaryHint.TextColor3 = Theme.Colors.TextMuted
	summaryHint.TextXAlignment = Enum.TextXAlignment.Left
	summaryHint.Text = "Waiting for Roblox selection"
	summaryHint.TextTruncate = Enum.TextTruncate.AtEnd
	summaryHint.Parent = summary

	local scroll = ScrollingFrame.create({
		name = "ExplorerScroll",
		size = UDim2.new(1, 0, 0, 0),
		autoSize = true,
		maxHeight = 260,
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
	emptyLabel.Size = UDim2.new(1, 0, 0, 40)
	emptyLabel.BackgroundTransparency = 1
	emptyLabel.Font = Theme.Font.Default
	emptyLabel.TextSize = Theme.Size.TextSmall
	emptyLabel.TextColor3 = Theme.Colors.TextMuted
	emptyLabel.Text = "Select a Roblox instance to preview."
	emptyLabel.Parent = scroll

	local function updateSummary(selectedInstances, connected)
		local count = #selectedInstances
		summaryLabel.Text = tostring(count) .. (count == 1 and " selected" or " selected")
		if not connected then
			summaryHint.Text = "Bridge offline"
			return
		end
		if count == 0 then
			summaryHint.Text = "Waiting for Roblox selection"
		else
			summaryHint.Text = "Previewing selection and direct children"
		end
	end

	local function clearTree()
		for _, child in scroll:GetChildren() do
			if child:IsA("Frame") then
				child:Destroy()
			end
		end
	end

	local function buildAncestorChain(instance)
		local chain = {}
		local current = instance.Parent
		while current and current ~= game do
			table.insert(chain, 1, current)
			current = current.Parent
		end
		return chain
	end

	local function renderTree(selectedInstances)
		clearTree()

		if #selectedInstances == 0 then
			emptyLabel.Visible = true
			emptyLabel.Text = "Select a Roblox instance to preview."
			updateSummary(selectedInstances, true)
			return
		end

		emptyLabel.Visible = false
		updateSummary(selectedInstances, true)

		local rendered = {}
		local order = 0

		local function renderInstance(instance, depth, isAncestor)
			if rendered[instance] then return end
			rendered[instance] = true

			order = order + 1
			local hasChildren = #instance:GetChildren() > 0
			local nameColor = Theme.Colors.Text
			if isAncestor then
				nameColor = Theme.Colors.TextMuted
			end

			local item = TreeItem.create({
				name = instance.Name,
				depth = depth,
				hasChildren = hasChildren,
				onClick = function()
					Selection:Set({ instance })
				end,
				parent = scroll,
			})
			item.LayoutOrder = order

			local labelObj = item:FindFirstChild("Label")
			if labelObj then
				labelObj.TextColor3 = nameColor
			end
		end

		for _, inst in selectedInstances do
			local ancestors = buildAncestorChain(inst)

			for i, ancestor in ancestors do
				renderInstance(ancestor, i - 1, true)
			end

			local depth = #ancestors
			renderInstance(inst, depth, false)

			for _, child in inst:GetChildren() do
				renderInstance(child, depth + 1, false)
			end
		end
	end

	local _selectionConnection = nil

	local function startListening()
		if _selectionConnection then return end
		_selectionConnection = Selection.SelectionChanged:Connect(function()
			local selected = Selection:Get()
			renderTree(selected)
		end)

		local initial = Selection:Get()
		renderTree(initial)
	end

	local function stopListening()
		if _selectionConnection then
			_selectionConnection:Disconnect()
			_selectionConnection = nil
		end
		clearTree()
		emptyLabel.Visible = true
		emptyLabel.Text = "Connect to bridge to view instances"
		updateSummary({}, false)
	end

	State.on("connectionChanged", function(connected)
		if connected then
			startListening()
		else
			stopListening()
		end
	end)

	if State.isConnected() then
		startListening()
	else
		stopListening()
	end

	return {
		section = section,
		scroll = scroll,
		refresh = function()
			local selected = Selection:Get()
			renderTree(selected)
		end,
	}
end

return ExplorerView
