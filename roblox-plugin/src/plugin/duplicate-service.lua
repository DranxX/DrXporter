local UuidService = require(script.Parent["uuid-service"])
local Logger = require(script.Parent.logger)

local DuplicateService = {}

function DuplicateService.detectDuplicates(uuids)
	local counts = {}
	local duplicates = {}

	for _, uuid in uuids do
		counts[uuid] = (counts[uuid] or 0) + 1
		if counts[uuid] > 1 then
			table.insert(duplicates, {
				uuid = uuid,
				count = counts[uuid],
			})
		end
	end

	return duplicates
end

function DuplicateService.detectDuplicatesInTree(root)
	local allUuids = UuidService.collectUuids(root)
	local uuidList = {}
	for _, entry in allUuids do
		table.insert(uuidList, entry.uuid)
	end
	return DuplicateService.detectDuplicates(uuidList)
end

function DuplicateService.rewriteDuplicate(instance)
	local newUuid = UuidService.generateUuid()
	local ok = UuidService.setUuid(instance, newUuid)
	if ok then
		Logger.info("Rewrote UUID for " .. instance:GetFullName() .. " -> " .. newUuid)
		return newUuid
	end
	return nil
end

function DuplicateService.resolveAllDuplicates(root)
	local allUuids = UuidService.collectUuids(root)
	local seen = {}
	local resolved = 0

	for _, entry in allUuids do
		if seen[entry.uuid] then
			local newUuid = DuplicateService.rewriteDuplicate(entry.instance)
			if newUuid then
				resolved = resolved + 1
			end
		else
			seen[entry.uuid] = true
		end
	end

	Logger.info("Resolved " .. resolved .. " duplicate UUIDs")
	return resolved
end

return DuplicateService
