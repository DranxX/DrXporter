local Theme = require(script.Parent.Parent.Parent.theme)
local Section = require(script.Parent.Parent.components.section)
local ScrollingFrame = require(script.Parent.Parent.components["scrolling-frame"])
local TreeItem = require(script.Parent.Parent.components["tree-item"])
local State = require(script.Parent.Parent.Parent.state)
local Selection = game:GetService("Selection")

local ExplorerView = {}

function ExplorerView.render(parent)
	local section = Section.create({
		name = "ExplorerSection",
		title = "Explorer",
		parent = parent,
	})

	local scroll = ScrollingFrame.create({
		name = "ExplorerScroll",
		size = UDim2.new(1, 0, 0, 0),
		autoSize = true,
		maxHeight = 300,
		spacing = 1,
		parent = section.content,
	})

	local emptyLabel = Instance.new("TextLabel")
	emptyLabel.Name = "EmptyLabel"
	emptyLabel.Size = UDim2.new(1, 0, 0, 40)
	emptyLabel.BackgroundTransparency = 1
	emptyLabel.Font = Theme.Font.Default
	emptyLabel.TextSize = Theme.Size.TextSmall
	emptyLabel.TextColor3 = Theme.Colors.TextMuted
	emptyLabel.Text = "Select instances in Explorer to preview"
	emptyLabel.Parent = scroll

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
			emptyLabel.Text = "Select instances in Explorer to preview"
			return
		end

		emptyLabel.Visible = false

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
		if #initial > 0 then
			renderTree(initial)
		end
	end

	local function stopListening()
		if _selectionConnection then
			_selectionConnection:Disconnect()
			_selectionConnection = nil
		end
		clearTree()
		emptyLabel.Visible = true
		emptyLabel.Text = "Connect to bridge to view instances"
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
