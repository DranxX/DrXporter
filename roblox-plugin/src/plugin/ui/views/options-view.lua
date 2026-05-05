local Theme = require(script.Parent.Parent.Parent.theme)
local Section = require(script.Parent.Parent.components.section)
local Button = require(script.Parent.Parent.components.button)
local Checkbox = require(script.Parent.Parent.components.checkbox)
local ExportService = require(script.Parent.Parent.Parent["export-service"])
local ImportService = require(script.Parent.Parent.Parent["import-service"])
local SyncService = require(script.Parent.Parent.Parent["sync-service"])
local State = require(script.Parent.Parent.Parent.state)
local Logger = require(script.Parent.Parent.Parent.logger)
local Selection = game:GetService("Selection")

local OptionsView = {}

function OptionsView.render(parent)
	local section = Section.create({
		name = "OptionsSection",
		title = "Actions",
		parent = parent,
	})

	local statusLabel = Instance.new("TextLabel")
	statusLabel.Name = "ExportStatus"
	statusLabel.Size = UDim2.new(1, 0, 0, 20)
	statusLabel.BackgroundTransparency = 1
	statusLabel.Font = Theme.Font.Default
	statusLabel.TextSize = Theme.Size.TextSmall
	statusLabel.TextColor3 = Theme.Colors.TextMuted
	statusLabel.TextXAlignment = Enum.TextXAlignment.Left
	statusLabel.Text = ""
	statusLabel.Visible = false
	statusLabel.LayoutOrder = 10
	statusLabel.Parent = section.content

	local exportSelectedBtn = Button.create({
		name = "ExportSelectedButton",
		text = "EXPORT SELECTED",
		color = Theme.Colors.AccentYellow,
		textColor = Theme.Colors.Background,
		size = UDim2.new(1, 0, 0, Theme.Size.RowHeight + 4),
		parent = section.content,
	})
	exportSelectedBtn.LayoutOrder = 1

	local exportAllBtn = Button.create({
		name = "ExportAllButton",
		text = "EXPORT ALL",
		color = Theme.Colors.AccentBlue,
		textColor = Theme.Colors.Background,
		size = UDim2.new(1, 0, 0, Theme.Size.RowHeight + 4),
		parent = section.content,
	})
	exportAllBtn.LayoutOrder = 2

	local exportScriptsBtn = Button.create({
		name = "ExportScriptsButton",
		text = "EXPORT SCRIPTS ONLY",
		color = Theme.Colors.AccentBlue,
		textColor = Theme.Colors.Background,
		size = UDim2.new(1, 0, 0, Theme.Size.RowHeight + 4),
		parent = section.content,
	})
	exportScriptsBtn.LayoutOrder = 3

	local refreshBtn = Button.create({
		name = "RefreshButton",
		text = "REFRESH FROM ROBLOX",
		color = Theme.Colors.Success,
		textColor = Theme.Colors.Background,
		size = UDim2.new(1, 0, 0, Theme.Size.RowHeight + 4),
		parent = section.content,
	})
	refreshBtn.LayoutOrder = 4

	local forceOverwriteBtn = Button.create({
		name = "ForceOverwriteButton",
		text = "FORCE OVERWRITE SRC",
		color = Theme.Colors.Error,
		textColor = Theme.Colors.Text,
		size = UDim2.new(1, 0, 0, Theme.Size.RowHeight + 4),
		parent = section.content,
	})
	forceOverwriteBtn.LayoutOrder = 5

	local importBtn = Button.create({
		name = "ImportButton",
		text = "IMPORT SELECTED",
		color = Theme.Colors.Surface,
		textColor = Theme.Colors.Text,
		size = UDim2.new(1, 0, 0, Theme.Size.RowHeight + 4),
		parent = section.content,
	})
	importBtn.LayoutOrder = 6

	local settingsSection = Section.create({
		name = "SettingsSection",
		title = "Settings",
		parent = parent,
	})

	local settingsStatus = Instance.new("TextLabel")
	settingsStatus.Name = "SettingsStatus"
	settingsStatus.Size = UDim2.new(1, 0, 0, 20)
	settingsStatus.BackgroundTransparency = 1
	settingsStatus.Font = Theme.Font.Default
	settingsStatus.TextSize = Theme.Size.TextSmall
	settingsStatus.TextColor3 = Theme.Colors.TextMuted
	settingsStatus.TextXAlignment = Enum.TextXAlignment.Left
	settingsStatus.Text = ""
	settingsStatus.Visible = false
	settingsStatus.LayoutOrder = 3
	settingsStatus.Parent = settingsSection.content

	local quietOutputToggle = Checkbox.create({
		name = "QuietOutputToggle",
		label = "Quiet Studio Output",
		checked = State.getSetting("quietOutput") ~= false,
		parent = settingsSection.content,
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
		parent = settingsSection.content,
		onToggle = function(checked)
			State.setSetting("debugLogs", checked)
			settingsStatus.Visible = true
			settingsStatus.TextColor3 = checked and Theme.Colors.Warning or Theme.Colors.Success
			settingsStatus.Text = checked and "Debug logs enabled" or "Debug logs hidden"
		end,
	})
	debugLogsToggle.frame.LayoutOrder = 2

	local function showStatus(text, color)
		statusLabel.Visible = true
		statusLabel.Text = text
		statusLabel.TextColor3 = color or Theme.Colors.TextMuted
	end

	exportSelectedBtn.MouseButton1Click:Connect(function()
		if not State.isConnected() then
			showStatus("✗ Not connected to bridge", Theme.Colors.Error)
			return
		end

		local selected = Selection:Get()
		if #selected == 0 then
			showStatus("✗ No instances selected in Explorer", Theme.Colors.Warning)
			return
		end

		exportSelectedBtn.Text = "EXPORTING..."
		showStatus("Generating UUIDs and exporting...", Theme.Colors.TextMuted)

		task.spawn(function()
			local success, err = ExportService.exportSelection(selected)
			if success then
				showStatus("✓ Exported " .. #selected .. " selected instances", Theme.Colors.Success)
			else
				showStatus("✗ Export failed: " .. tostring(err), Theme.Colors.Error)
			end
			exportSelectedBtn.Text = "EXPORT SELECTED"
		end)
	end)

	exportAllBtn.MouseButton1Click:Connect(function()
		if not State.isConnected() then
			showStatus("✗ Not connected to bridge", Theme.Colors.Error)
			return
		end

		exportAllBtn.Text = "EXPORTING ALL..."
		showStatus("Exporting all services...", Theme.Colors.TextMuted)

		task.spawn(function()
			local success, err = ExportService.exportAll()
			if success then
				showStatus("✓ Full export completed", Theme.Colors.Success)
			else
				showStatus("✗ Export failed: " .. tostring(err), Theme.Colors.Error)
			end
			exportAllBtn.Text = "EXPORT ALL"
		end)
	end)

	exportScriptsBtn.MouseButton1Click:Connect(function()
		if not State.isConnected() then
			showStatus("✗ Not connected to bridge", Theme.Colors.Error)
			return
		end

		exportScriptsBtn.Text = "EXPORTING..."
		showStatus("Finding instances with scripts...", Theme.Colors.TextMuted)

		task.spawn(function()
			local success, err = ExportService.exportScriptsOnly()
			if success then
				showStatus("✓ Scripts-only export completed", Theme.Colors.Success)
			else
				showStatus("✗ Export failed: " .. tostring(err), Theme.Colors.Error)
			end
			exportScriptsBtn.Text = "EXPORT SCRIPTS ONLY"
		end)
	end)

	refreshBtn.MouseButton1Click:Connect(function()
		if not State.isConnected() then
			showStatus("✗ Not connected to bridge", Theme.Colors.Error)
			return
		end

		refreshBtn.Text = "REFRESHING..."
		showStatus("Syncing Roblox snapshot to VSCode...", Theme.Colors.TextMuted)

		task.spawn(function()
			local success, err = SyncService.refreshAll(false)
			if success then
				showStatus("✓ Refreshed from Roblox", Theme.Colors.Success)
			else
				showStatus("✗ Refresh failed: " .. tostring(err), Theme.Colors.Error)
			end
			refreshBtn.Text = "REFRESH FROM ROBLOX"
		end)
	end)

	forceOverwriteBtn.MouseButton1Click:Connect(function()
		if not State.isConnected() then
			showStatus("✗ Not connected to bridge", Theme.Colors.Error)
			return
		end

		forceOverwriteBtn.Text = "OVERWRITING..."
		showStatus("Replacing src with Roblox snapshot...", Theme.Colors.Warning)

		task.spawn(function()
			local success, err = SyncService.refreshAll(true)
			if success then
				showStatus("✓ Force overwrite completed", Theme.Colors.Success)
			else
				showStatus("✗ Force overwrite failed: " .. tostring(err), Theme.Colors.Error)
			end
			forceOverwriteBtn.Text = "FORCE OVERWRITE SRC"
		end)
	end)

	importBtn.MouseButton1Click:Connect(function()
		if not State.isConnected() then
			showStatus("✗ Not connected to bridge", Theme.Colors.Error)
			return
		end

		local selected = Selection:Get()
		if #selected == 0 then
			showStatus("✗ No instances selected in Explorer", Theme.Colors.Warning)
			return
		end

		importBtn.Text = "IMPORTING..."
		showStatus("Collecting UUIDs from selection...", Theme.Colors.TextMuted)

		task.spawn(function()
			local uuids = ImportService.collectUuidsFromSelection(selected)

			if #uuids == 0 then
				showStatus("✗ Selected instances have no UUIDs (export first)", Theme.Colors.Warning)
				importBtn.Text = "IMPORT SELECTED"
				return
			end

			Logger.info("Importing " .. #uuids .. " UUIDs from bridge")
			local success, err = ImportService.importFromBridge(uuids)
			if success then
				showStatus("✓ Imported " .. #uuids .. " items from bridge", Theme.Colors.Success)
			else
				showStatus("✗ Import failed: " .. tostring(err), Theme.Colors.Error)
			end
			importBtn.Text = "IMPORT SELECTED"
		end)
	end)

	return {
		section = section,
	}
end

return OptionsView
