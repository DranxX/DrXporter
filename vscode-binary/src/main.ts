import { parseArgs } from "./cli/args";
import { executeCommand } from "./cli/commands";
import { printHelp } from "./cli/help";
import { createLogger } from "./logging/logger";

const logger = createLogger("main");

export async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return;
  }

  logger.info(`DrXporter v1.0.1 - command: ${args.command}`);

  try {
    await executeCommand(args);
  } catch (err) {
    logger.fatal(`Unhandled error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
