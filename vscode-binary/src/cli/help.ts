export function printHelp(): void {
  const text = `
DrXporter CLI v0.1.0

Usage: drxporter [command] [options]

Running without arguments starts the bridge server.

Commands:
  (default)          Start the bridge server with auto-sync
  init               Alias for starting the server
  reset              Clear all cache, UUIDs, exported files, and connections
  inspect-cache      Inspect UUID cache contents
  build-plugin       Build the Roblox plugin
  build-binary       Build the binary/CLI
  build-all          Build everything

Options:
  --help, -h         Show this help message
  --port, -p <port>  Bridge server port (default: 34872)
  --host <host>      Bridge server host (default: 127.0.0.1)
  --verbose, -v      Verbose output

Auto-sync (bidirectional):
  Studio → VSCode:  Script changes in Roblox are pushed to ./src/ automatically
  VSCode → Studio:  Editing .lua files in ./src/ syncs back to Studio
  On connect:       Timestamps are compared, newest version wins
`.trim();

  console.log(text);
}
