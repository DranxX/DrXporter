local Selection = game:GetService("Selection")
local UuidService = require(script.Parent["uuid-service"])
local SelectionService = require(script.Parent["selection-service"])
local AncestorService = require(script.Parent["ancestor-service"])
local State = require(script.Parent.state)
local Logger = require(script.Parent.logger)

local SelectionController = {}

local _connection = nil

function SelectionController.start()
	if _connection then return end

	_connection = Selection.SelectionChanged:Connect(function()
		local selected = Selection:Get()
		local result = SelectionService.resolveSelection(selected)
		State.setSelectedUuids(result.selectedUuids)
		State.setAncestorUuids(result.ancestorUuids)
	end)

	Logger.info("Selection controller started")
end

function SelectionController.stop()
	if _connection then
		_connection:Disconnect()
		_connection = nil
	end
end

function SelectionController.getSelection()
	return {
		selectedUuids = State.getSelectedUuids(),
		ancestorUuids = State.getAncestorUuids(),
	}
end

return SelectionController
