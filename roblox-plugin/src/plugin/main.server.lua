local Plugin = script:FindFirstAncestorWhichIsA("Plugin")
if not Plugin then return end

local Bootstrap = require(script.Parent.bootstrap)
Bootstrap.init(Plugin)
