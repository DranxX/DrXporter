local UuidService = require(script.Parent["uuid-service"])
local AncestorService = require(script.Parent["ancestor-service"])
local Logger = require(script.Parent.logger)

local SelectionService = {}

function SelectionService.resolveSelection(instances)
	local selectedUuids = {}
	local ancestorUuids = {}
	local seen = {}

	for _, instance in instances do
		local uuid = UuidService.getUuid(instance)
		if uuid and not seen[uuid] then
			seen[uuid] = true
			table.insert(selectedUuids, uuid)

			local ancestors = AncestorService.getAncestorChain(instance)
			for _, ancestor in ancestors do
				local aUuid = UuidService.getUuid(ancestor)
				if aUuid and not seen[aUuid] then
					seen[aUuid] = true
					table.insert(ancestorUuids, aUuid)
				end
			end
		end
	end

	return {
		selectedUuids = selectedUuids,
		ancestorUuids = ancestorUuids,
		totalSelected = #selectedUuids,
		totalAncestors = #ancestorUuids,
	}
end

function SelectionService.resolveDescendants(instance, includeDescendants)
	local uuids = {}
	if not includeDescendants then
		local uuid = UuidService.getUuid(instance)
		if uuid then table.insert(uuids, uuid) end
		return uuids
	end

	local function traverse(inst)
		local uuid = UuidService.getUuid(inst)
		if uuid then table.insert(uuids, uuid) end
		for _, child in inst:GetChildren() do
			traverse(child)
		end
	end
	traverse(instance)
	return uuids
end

return SelectionService
