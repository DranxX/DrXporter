local Constants = require(script.Parent.constants)
local UuidService = require(script.Parent["uuid-service"])

local ExplorerTree = {}

function ExplorerTree.buildTree(root)
	local tree = {}

	local function traverse(instance)
		local uuid = UuidService.getUuid(instance)
		if not uuid then return nil end

		local node = {
			uuid = uuid,
			name = instance.Name,
			className = instance.ClassName,
			instance = instance,
			children = {},
			isAncestorOnly = false,
		}

		for _, child in instance:GetChildren() do
			local childNode = traverse(child)
			if childNode then
				table.insert(node.children, childNode)
			end
		end

		return node
	end

	for _, serviceName in Constants.SERVICE_NAMES do
		local success, svc = pcall(function()
			return game:GetService(serviceName)
		end)
		if success and svc then
			local node = traverse(svc)
			if node then
				table.insert(tree, node)
			end
		end
	end

	return tree
end

function ExplorerTree.findNode(tree, uuid)
	for _, node in tree do
		if node.uuid == uuid then return node end
		local found = ExplorerTree.findNode(node.children, uuid)
		if found then return found end
	end
	return nil
end

function ExplorerTree.flattenUuids(tree)
	local uuids = {}
	local function collect(nodes)
		for _, node in nodes do
			table.insert(uuids, node.uuid)
			collect(node.children)
		end
	end
	collect(tree)
	return uuids
end

return ExplorerTree
