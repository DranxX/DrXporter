local PropertySelector = {}

local _selectedProperties = {}

function PropertySelector.setProperties(className, properties)
	_selectedProperties[className] = properties
end

function PropertySelector.getProperties(className)
	return _selectedProperties[className] or {}
end

function PropertySelector.toggleProperty(className, propertyName)
	if not _selectedProperties[className] then
		_selectedProperties[className] = {}
	end

	local props = _selectedProperties[className]
	local index = table.find(props, propertyName)
	if index then
		table.remove(props, index)
	else
		table.insert(props, propertyName)
	end
end

function PropertySelector.isSelected(className, propertyName)
	local props = _selectedProperties[className]
	if not props then return false end
	return table.find(props, propertyName) ~= nil
end

function PropertySelector.clear()
	_selectedProperties = {}
end

function PropertySelector.getAll()
	return _selectedProperties
end

return PropertySelector
