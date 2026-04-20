export interface ParsedArgs {
  command: string;
  flags: Record<string, string | boolean>;
  positional: string[];
  help: boolean;
}

const SHORT_FLAGS_WITH_VALUE = new Set(["p", "c"]);

export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let command = "serve";
  let help = false;
  let commandSet = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
      continue;
    }

    if (arg.startsWith("-") && arg.length === 2) {
      const key = arg.slice(1);
      if (SHORT_FLAGS_WITH_VALUE.has(key)) {
        const next = argv[i + 1];
        if (next && !next.startsWith("-")) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      } else {
        flags[key] = true;
      }
      continue;
    }

    if (!commandSet) {
      command = arg;
      commandSet = true;
    } else {
      positional.push(arg);
    }
  }

  return { command, flags, positional, help };
}
