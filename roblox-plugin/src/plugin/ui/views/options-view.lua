local Theme = require(script.Parent.Parent.Parent.theme)
local Section = require(script.Parent.Parent.components.section)
local Button = require(script.Parent.Parent.components.button)
local Checkbox = require(script.Parent.Parent.components.checkbox)
local ExportService = require(script.Parent.Parent.Parent["export-service"])
local ImportService = require(script.Parent.Parent.Parent["import-service"])
local SyncService = require(script.Parent.Parent.Parent["sync-service"])
local State = require(script.Parent.Parent.Parent.state)
local Selection = game:GetService("Selection")

local OptionsView = {}

local function addCorner(parent, radius)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius or Theme.Size.BorderRadius)
	corner.Parent = parent
	return corner
end

local function addStroke(parent, transparency)
	local stroke = Instance.new("UIStroke")
	stroke.Color = Theme.Colors.Border
	stroke.Transparency = transparency or 0.4
	stroke.Thickness = 1
	stroke.Parent = parent
	return stroke
end

local function createLabel(props)
	local label = Instance.new("TextLabel")
	label.Name = props.name or "Label"
	label.Size = props.size or UDim2.fromScale(1, 1)
	label.Position = props.position or UDim2.new()
	label.BackgroundTransparency = 1
	label.Font = props.font or Theme.Font.Default
	label.TextSize = props.textSize or Theme.Size.TextNormal
	label.TextColor3 = props.color or Theme.Colors.Text
	label.TextXAlignment = props.xAlignment or Enum.TextXAlignment.Left
	label.TextYAlignment = props.yAlignment or Enum.TextYAlignment.Center
	label.TextWrapped = props.wrapped == true
	label.TextTruncate = props.truncate or Enum.TextTruncate.None
	label.Text = props.text or ""
	label.Parent = props.parent
	return label
end

local function createStatusPanel(parent)
	local panel = Instance.new("Frame")
	panel.Name = "SyncStatusPanel"
	panel.Size = UDim2.new(1, 0, 0, 44)
	panel.BackgroundColor3 = Theme.Colors.SurfaceAlt
	panel.BorderSizePixel = 0
	panel.LayoutOrder = 1
	panel.Parent = parent
	addCorner(panel)
	addStroke(panel, 0.5)

	local accent = Instance.new("Frame")
	accent.Name = "Accent"
	accent.Size = UDim2.new(0, 4, 1, -14)
	accent.Position = UDim2.new(0, 9, 0, 7)
	accent.BackgroundColor3 = Theme.Colors.TextSubtle
	accent.BorderSizePixel = 0
	accent.Parent = panel
	addCorner(accent, 3)

	local label = createLabel({
		name = "StatusLabel",
		size = UDim2.new(1, -28, 1, 0),
		position = UDim2.new(0, 22, 0, 0),
		textSize = Theme.Size.TextSmall,
		wrapped = true,
		text = "",
		parent = panel,
	})

	return {
		frame = panel,
		accent = accent,
		label = label,
	}
end

local function createDirectionRow(parent)
	local row = Instance.new("Frame")
	row.Name = "DirectionBlocks"
	row.Size = UDim2.new(1, 0, 0, 194)
	row.BackgroundTransparency = 1
	row.LayoutOrder = 2
	row.Parent = parent

	local layout = Instance.new("UIListLayout")
	layout.FillDirection = Enum.FillDirection.Horizontal
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, Theme.Size.PaddingSmall)
	layout.Parent = row

	return row
end

local function createDirectionCard(parent, layoutOrder, title, accentColor)
	local card = Instance.new("Frame")
	card.Name = title:gsub("%W+", "") .. "Card"
	card.Size = UDim2.new(0.5, -3, 1, 0)
	card.BackgroundColor3 = Theme.Colors.SurfaceAlt
	card.BorderSizePixel = 0
	card.LayoutOrder = layoutOrder
	card.Parent = parent
	addCorner(card)
	addStroke(card, 0.5)

	local accent = Instance.new("Frame")
	accent.Name = "Accent"
	accent.Size = UDim2.new(0, 4, 1, -16)
	accent.Position = UDim2.new(0, 8, 0, 8)
	accent.BackgroundColor3 = accentColor
	accent.BorderSizePixel = 0
	accent.Parent = card
	addCorner(accent, 3)

	createLabel({
		name = "Title",
		size = UDim2.new(1, -28, 0, 24),
		position = UDim2.new(0, 20, 0, 8),
		font = Theme.Font.Bold,
		textSize = Theme.Size.TextSmall,
		truncate = Enum.TextTruncate.AtEnd,
		text = title,
		parent = card,
	})

	local content = Instance.new("Frame")
	content.Name = "Actions"
	content.Size = UDim2.new(1, -24, 1, -42)
	content.Position = UDim2.new(0, 12, 0, 36)
	content.BackgroundTransparency = 1
	content.Parent = card

	local layout = Instance.new("UIListLayout")
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, Theme.Size.PaddingSmall)
	layout.Parent = content

	return content
end

local function createActionButton(parent, layoutOrder, name, text, color, textColor)
	local button = Button.create({
		name = name,
		text = text,
		color = color,
		textColor = textColor or Theme.Colors.Text,
		textSize = Theme.Size.TextSmall,
		size = UDim2.new(1, 0, 0, 32),
		parent = parent,
	})
	button.LayoutOrder = layoutOrder
	return button
end

local function createSettingsPanel(parent)
	local panel = Instance.new("Frame")
	panel.Name = "SettingsPanel"
	panel.Size = UDim2.new(1, 0, 0, 126)
	panel.BackgroundColor3 = Theme.Colors.SurfaceAlt
	panel.BorderSizePixel = 0
	panel.LayoutOrder = 1
	panel.Parent = parent
	addCorner(panel)
	addStroke(panel, 0.5)

	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, Theme.Size.PaddingSmall)
	padding.PaddingBottom = UDim.new(0, Theme.Size.PaddingSmall)
	padding.PaddingLeft = UDim.new(0, Theme.Size.Padding)
	padding.PaddingRight = UDim.new(0, Theme.Size.Padding)
	padding.Parent = panel

	local layout = Instance.new("UIListLayout")
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, Theme.Size.PaddingSmall)
	layout.Parent = panel

	return panel
end

function OptionsView.render(parent)
	local section = Section.create({
		name = "OptionsSection",
		title = "Sync Dashboard",
		layoutOrder = 4,
		parent = parent,
	})

	local statusPanel = createStatusPanel(section.content)
	local directionRow = createDirectionRow(section.content)
	local robloxToCode = createDirectionCard(directionRow, 1, "Roblox -> VSCode", Theme.Colors.AccentBlue)
	local codeToRoblox = createDirectionCard(directionRow, 2, "VSCode -> Roblox", Theme.Colors.Success)

	local robloxImportAllBtn =
		createActionButton(robloxToCode, 1, "RobloxImportAllButton", "Import all", Theme.Colors.AccentBlue)
	local robloxImportSelectionBtn = createActionButton(
		robloxToCode,
		2,
		"RobloxImportSelectionButton",
		"Import selection",
		Theme.Colors.AccentYellow,
		Theme.Colors.Background
	)
	local robloxRefreshBtn =
		createActionButton(robloxToCode, 3, "RobloxRefreshButton", "Refresh", Theme.Colors.SurfaceHover)
	local robloxForceBtn =
		createActionButton(robloxToCode, 4, "RobloxForceButton", "Force import", Theme.Colors.Error)

	local codeImportAllBtn =
		createActionButton(codeToRoblox, 1, "CodeImportAllButton", "Import all", Theme.Colors.Success, Theme.Colors.Background)
	local codeRefreshBtn =
		createActionButton(codeToRoblox, 2, "CodeRefreshButton", "Refresh", Theme.Colors.SurfaceHover)
	local codeForceBtn =
		createActionButton(codeToRoblox, 3, "CodeForceButton", "Force import", Theme.Colors.Warning, Theme.Colors.Background)

	local settingsSection = Section.create({
		name = "SettingsSection",
		title = "Settings",
		layoutOrder = 5,
		parent = parent,
	})

	local settingsPanel = createSettingsPanel(settingsSection.content)

	local settingsStatus = createLabel({
		name = "SettingsStatus",
		size = UDim2.new(1, 0, 0, 22),
		textSize = Theme.Size.TextSmall,
		color = Theme.Colors.TextMuted,
		text = "",
		parent = settingsSection.content,
	})
	settingsStatus.Visible = false
	settingsStatus.LayoutOrder = 2

	local quietOutputToggle = Checkbox.create({
		name = "QuietOutputToggle",
		label = "Quiet Studio Output",
		checked = State.getSetting("quietOutput") ~= false,
		parent = settingsPanel,
		onToggle = function(checked)
			State.setSetting("quietOutput", checked)
			settingsStatus.Visible = true
			settingsStatus.TextColor3 = Theme.Colors.Success
			settingsStatus.Text = checked and "Info logs hidden" or "Info logs visible"
		end,
	})
	quietOutputToggle.frame.LayoutOrder = 1

	local debugLogsToggle = Checkbox.create({
		name = "DebugLogsToggle",
		label = "Debug Logs",
		checked = State.getSetting("debugLogs") == true,
		parent = settingsPanel,
		onToggle = function(checked)
			State.setSetting("debugLogs", checked)
			settingsStatus.Visible = true
			settingsStatus.TextColor3 = checked and Theme.Colors.Warning or Theme.Colors.Success
			settingsStatus.Text = checked and "Debug logs enabled" or "Debug logs hidden"
		end,
	})
	debugLogsToggle.frame.LayoutOrder = 2

	local resetAllBtn = createActionButton(settingsPanel, 3, "ResetAllButton", "Reset all UUIDs", Theme.Colors.Error)

	local function showStatus(text, color)
		statusPanel.label.Text = text
		statusPanel.label.TextColor3 = color or Theme.Colors.TextMuted
		statusPanel.accent.BackgroundColor3 = color or Theme.Colors.TextSubtle
	end

	local function showConnectionStatus(connected)
		if connected then
			showStatus("Auto sync live: VSCode <-> Roblox.", Theme.Colors.Success)
		else
			showStatus("Bridge offline. Connect first to sync.", Theme.Colors.TextMuted)
		end
	end

	robloxImportAllBtn.MouseButton1Click:Connect(function()
		if not State.isConnected() then
			showStatus("Not connected to bridge.", Theme.Colors.Error)
			return
		end

		robloxImportAllBtn.Text = "Importing..."
		showStatus("Importing Roblox snapshot into VSCode...", Theme.Colors.TextMuted)

		task.spawn(function()
			local success, err = ExportService.exportAll()
			if success then
				showStatus("Roblox -> VSCode import completed.", Theme.Colors.Success)
			else
				showStatus("Roblox -> VSCode import failed: " .. tostring(err), Theme.Colors.Error)
			end
			robloxImportAllBtn.Text = "Import all"
		end)
	end)

	robloxImportSelectionBtn.MouseButton1Click:Connect(function()
		if not State.isConnected() then
			showStatus("Not connected to bridge.", Theme.Colors.Error)
			return
		end

		local selected = Selection:Get()
		if #selected == 0 then
			showStatus("No instances selected in Explorer.", Theme.Colors.Warning)
			return
		end

		robloxImportSelectionBtn.Text = "Importing..."
		showStatus("Importing selected Roblox items into VSCode...", Theme.Colors.TextMuted)

		task.spawn(function()
			local success, err = ExportService.exportSelection(selected)
			if success then
				showStatus("Imported " .. #selected .. " selected Roblox items.", Theme.Colors.Success)
			else
				showStatus("Selection import failed: " .. tostring(err), Theme.Colors.Error)
			end
			robloxImportSelectionBtn.Text = "Import selection"
		end)
	end)

	robloxRefreshBtn.MouseButton1Click:Connect(function()
		if not State.isConnected() then
			showStatus("Not connected to bridge.", Theme.Colors.Error)
			return
		end

		robloxRefreshBtn.Text = "Refreshing..."
		showStatus("Refreshing changed Roblox items...", Theme.Colors.TextMuted)

		task.spawn(function()
			local success, count, err = SyncService.refreshStudioChanges()
			if success then
				showStatus("Roblox -> VSCode refreshed " .. tostring(count) .. " change(s).", Theme.Colors.Success)
			else
				showStatus("Refresh failed: " .. tostring(err), Theme.Colors.Error)
			end
			robloxRefreshBtn.Text = "Refresh"
		end)
	end)

	robloxForceBtn.MouseButton1Click:Connect(function()
		if not State.isConnected() then
			showStatus("Not connected to bridge.", Theme.Colors.Error)
			return
		end

		robloxForceBtn.Text = "Forcing..."
		showStatus("Force importing Roblox snapshot into VSCode...", Theme.Colors.Warning)

		task.spawn(function()
			local success, err = SyncService.refreshAll(true)
			if success then
				showStatus("Force import Roblox -> VSCode completed.", Theme.Colors.Success)
			else
				showStatus("Force import failed: " .. tostring(err), Theme.Colors.Error)
			end
			robloxForceBtn.Text = "Force import"
		end)
	end)

	codeImportAllBtn.MouseButton1Click:Connect(function()
		if not State.isConnected() then
			showStatus("Not connected to bridge.", Theme.Colors.Error)
			return
		end

		codeImportAllBtn.Text = "Importing..."
		showStatus("Importing VSCode snapshot into Roblox...", Theme.Colors.TextMuted)

		task.spawn(function()
			local success, err = ImportService.importAllFromBridge(false)
			if success then
				showStatus("VSCode -> Roblox import completed.", Theme.Colors.Success)
			else
				showStatus("VSCode -> Roblox import failed: " .. tostring(err), Theme.Colors.Error)
			end
			codeImportAllBtn.Text = "Import all"
		end)
	end)

	codeRefreshBtn.MouseButton1Click:Connect(function()
		if not State.isConnected() then
			showStatus("Not connected to bridge.", Theme.Colors.Error)
			return
		end

		codeRefreshBtn.Text = "Refreshing..."
		showStatus("Refreshing changed VSCode items...", Theme.Colors.TextMuted)

		task.spawn(function()
			local success, count, err = SyncService.refreshBridgeChanges()
			if success then
				showStatus("VSCode -> Roblox refreshed " .. tostring(count) .. " change(s).", Theme.Colors.Success)
			else
				showStatus("Refresh failed: " .. tostring(err), Theme.Colors.Error)
			end
			codeRefreshBtn.Text = "Refresh"
		end)
	end)

	codeForceBtn.MouseButton1Click:Connect(function()
		if not State.isConnected() then
			showStatus("Not connected to bridge.", Theme.Colors.Error)
			return
		end

		codeForceBtn.Text = "Forcing..."
		showStatus("Force importing VSCode snapshot into Roblox...", Theme.Colors.Warning)

		task.spawn(function()
			local success, err = ImportService.importAllFromBridge(true)
			if success then
				showStatus("Force import VSCode -> Roblox completed.", Theme.Colors.Success)
			else
				showStatus("Force import failed: " .. tostring(err), Theme.Colors.Error)
			end
			codeForceBtn.Text = "Force import"
		end)
	end)

	resetAllBtn.MouseButton1Click:Connect(function()
		resetAllBtn.Text = "Resetting..."
		showStatus("Regenerating all Roblox UUIDs...", Theme.Colors.Warning)

		task.spawn(function()
			local resetSuccess, count, resetErr = SyncService.regenerateAllUuids()
			if not resetSuccess then
				showStatus("UUID reset failed: " .. tostring(resetErr), Theme.Colors.Error)
				resetAllBtn.Text = "Reset all UUIDs"
				return
			end

			settingsStatus.Visible = true
			settingsStatus.TextColor3 = Theme.Colors.Warning
			settingsStatus.Text = "Regenerated " .. tostring(count) .. " UUIDs"

			if State.isConnected() then
				showStatus("UUIDs regenerated. Refreshing VSCode snapshot...", Theme.Colors.Warning)
				local success, err = SyncService.refreshAll(true)
				if success then
					showStatus("Reset all UUIDs and refreshed VSCode.", Theme.Colors.Success)
				else
					showStatus("UUID reset done, refresh failed: " .. tostring(err), Theme.Colors.Error)
				end
			else
				showStatus("Reset all UUIDs. Connect bridge to refresh.", Theme.Colors.Warning)
			end

			resetAllBtn.Text = "Reset all UUIDs"
		end)
	end)

	State.on("connectionChanged", showConnectionStatus)
	showConnectionStatus(State.isConnected())

	return {
		section = section,
		settingsSection = settingsSection,
	}
end

return OptionsView
