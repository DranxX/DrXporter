local process = require("@lune/process")

local ROOT = process.cwd
local result = process.spawn("rojo", { "build", "-o", ROOT .. "/../output/roblox-plugin/drxporter-plugin.rbxmx" }, { cwd = ROOT })

if result.ok then
	print("[export] Plugin exported")
else
	print("[export] FATAL: " .. result.stderr)
	process.exit(1)
end
