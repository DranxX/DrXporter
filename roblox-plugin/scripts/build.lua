local process = require("@lune/process")
local fs = require("@lune/fs")

local ROOT = process.cwd
local OUTPUT = ROOT .. "/../output/roblox-plugin"

if not fs.isDir(OUTPUT) then
	fs.writeDir(OUTPUT)
end

local result = process.spawn("rojo", { "build", "-o", OUTPUT .. "/drxporter-plugin.rbxmx" }, { cwd = ROOT })

if result.ok then
	print("[build] Plugin built successfully")
else
	print("[build] FATAL: " .. result.stderr)
	process.exit(1)
end
