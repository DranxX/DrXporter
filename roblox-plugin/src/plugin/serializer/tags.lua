local Tags = {}

function Tags.serialize(instance)
	local tags = instance:GetTags()
	table.sort(tags)
	return tags
end

function Tags.deserialize(instance, tags)
	for _, tag in tags do
		if not instance:HasTag(tag) then
			instance:AddTag(tag)
		end
	end
end

function Tags.removeAll(instance)
	for _, tag in instance:GetTags() do
		instance:RemoveTag(tag)
	end
end

return Tags
