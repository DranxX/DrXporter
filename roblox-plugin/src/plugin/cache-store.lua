local HttpService = game:GetService("HttpService")
local State = require(script.Parent.state)
local Logger = require(script.Parent.logger)

local CacheStore = {}

local _cache = {}

function CacheStore.getKey()
	local ck = State.getCacheKey()
	return ck.gameId .. ":" .. ck.placeId
end

function CacheStore.get(uuid)
	local key = CacheStore.getKey()
	if not _cache[key] then return nil end
	return _cache[key][uuid]
end

function CacheStore.set(uuid, data)
	local key = CacheStore.getKey()
	if not _cache[key] then
		_cache[key] = {}
	end
	_cache[key][uuid] = data
end

function CacheStore.remove(uuid)
	local key = CacheStore.getKey()
	if _cache[key] then
		_cache[key][uuid] = nil
	end
end

function CacheStore.getAll()
	local key = CacheStore.getKey()
	return _cache[key] or {}
end

function CacheStore.clear()
	local key = CacheStore.getKey()
	_cache[key] = {}
end

function CacheStore.clearAll()
	_cache = {}
end

return CacheStore
