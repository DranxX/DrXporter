local Constants = {}

Constants.UUID_ATTRIBUTE = "drxporter-uuid"
Constants.PLUGIN_NAME = "DrXporter"
Constants.PLUGIN_VERSION = "1.0.1"
Constants.DEFAULT_BRIDGE_HOST = "127.0.0.1"
Constants.DEFAULT_BRIDGE_PORT = 51234
Constants.PROTOCOL_VERSION = "1.0.0"

Constants.SCRIPT_CLASSES = {
	Script = ".server.lua",
	LocalScript = ".client.lua",
	ModuleScript = ".lua",
}

Constants.SERVICE_NAMES = {
	"Workspace",
	"ReplicatedStorage",
	"ReplicatedFirst",
	"ServerScriptService",
	"ServerStorage",
	"StarterGui",
	"StarterPack",
	"StarterPlayer",
	"Lighting",
	"SoundService",
}

return Constants
