import { readFileSync, existsSync } from "node:fs";
import type { ScriptDescriptor } from "@drxporter/shared";

export function readScriptFile(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}

export function buildScriptDescriptor(uuid: string, name: string, className: string, source: string): ScriptDescriptor {
  let scriptType: "server" | "client" | "module" = "module";
  if (className === "Script") scriptType = "server";
  else if (className === "LocalScript") scriptType = "client";

  return { uuid, name, scriptType, source, className };
}
