import { resolve, relative, sep } from "node:path";

export function toForwardSlash(p: string): string {
  return p.split(sep).join("/");
}

export function resolveRelative(base: string, target: string): string {
  return toForwardSlash(relative(base, target));
}

export function resolveAbsolute(base: string, ...segments: string[]): string {
  return resolve(base, ...segments);
}
