local process = require("@lune/process")
local fs = require("@lune/fs")

local OUTPUT = process.cwd .. "/../output/roblox-plugin"

if not fs.isDir(OUTPUT) then
	fs.writeDir(OUTPUT)
end

local result = process.spawn("rojo", { "build", "-o", OUTPUT .. "/drxporter-plugin.rbxmx" }, { cwd = process.cwd })

if result.ok then
	print("[package] Plugin packaged -> " .. OUTPUT .. "/drxporter-plugin.rbxmx")
else
	print("[package] FATAL: " .. result.stderr)
	process.exit(1)
end
