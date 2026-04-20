export interface FlagDefinition {
  name: string;
  alias?: string;
  type: "string" | "boolean" | "number";
  defaultValue?: string | boolean | number;
  description: string;
}

export const GLOBAL_FLAGS: FlagDefinition[] = [
  { name: "help", alias: "h", type: "boolean", description: "Show help" },
  { name: "port", alias: "p", type: "number", defaultValue: 34872, description: "Bridge server port" },
  { name: "host", type: "string", defaultValue: "127.0.0.1", description: "Bridge server host" },
  { name: "verbose", alias: "v", type: "boolean", description: "Verbose output" },
  { name: "config", alias: "c", type: "string", description: "Config file path" },
];

export function resolveFlag(flags: Record<string, string | boolean>, name: string, defaultValue?: string | boolean | number): string | boolean | number | undefined {
  if (name in flags) return flags[name];
  const def = GLOBAL_FLAGS.find((f) => f.name === name);
  if (def?.alias && def.alias in flags) return flags[def.alias];
  return defaultValue ?? def?.defaultValue;
}
