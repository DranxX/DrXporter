export const DEFAULT_BRIDGE_PORT = 34872;
export const DEFAULT_BRIDGE_HOST = "127.0.0.1";
export const DEFAULT_OUTPUT_ROOT = "output";
export const DEFAULT_CACHE_DIR = ".drxporter-cache";
export const DEFAULT_LOG_LEVEL = "info" as const;
export const PROTOCOL_VERSION = "1.0.0";
export const PLUGIN_VERSION = "0.1.0";
export const BINARY_VERSION = "0.1.0";
export const INSTANCE_JSON_EXTENSION = ".instance.json";
export const SCRIPT_EXTENSIONS: Record<string, string> = {
  Script: ".server.lua",
  LocalScript: ".client.lua",
  ModuleScript: ".lua",
};
