# DrXporter

> **⚠️ Notice:** This is a personal project and may be discontinued or updated infrequently. Feel free to modify the UI to suit your own needs.

Two-way sync system between Roblox Studio and your local filesystem. Export scripts and instances from Studio to organized local files, edit them in your favorite editor, and sync changes back — all in real-time.

## How It Works

DrXporter consists of two parts that communicate over a local HTTP bridge:

```
Roblox Studio ←→ Plugin (Luau) ←→ Bridge Server (Node.js) ←→ Local Filesystem
```

- **Roblox Plugin** — Installed in Roblox Studio. Provides a UI to select instances, choose which properties to export, and manages the connection to the local bridge server.
- **Local Binary** — A Node.js CLI server that runs on your machine. Handles filesystem read/write, caching, UUID tracking, schema validation, and bidirectional sync with the plugin.

Every exported instance is tracked by a `drxporter-uuid` attribute. This allows the system to reliably map Roblox instances to local files, even after renames or moves.

## Filesystem Layout

Exported scripts follow a Rojo-compatible layout:

```
Workspace/
  Map/
    Door/
      Script.server.lua
    Door.instance.json
```

| Extension | Script Type |
|---|---|
| `.server.lua` | `Script` |
| `.client.lua` | `LocalScript` |
| `.lua` | `ModuleScript` |

Non-script instances are stored as `.instance.json` files containing their properties, attributes, and tags.

## Features

- **Bidirectional live sync** — Edit scripts in Studio or your editor; changes propagate both ways automatically.
- **Selective export** — Choose exactly which instances and properties to export via the plugin UI.
- **UUID-based tracking** — Reliable instance-to-file mapping that survives renames and reparenting.
- **Cache scoping** — Cache is scoped by `GameId` and `PlaceId`, so multiple places don't conflict.
- **Strict diagnostics** — Stop-on-error behavior with detailed error codes and reporting.
- **Parent chain preservation** — Parent hierarchy is always included for selected descendants.

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Rojo](https://github.com/rojo-rbx/rojo) v7.4+ (for building the plugin)
- [Aftman](https://github.com/LPGhatguy/aftman) (optional, manages Rojo/Selene/StyLua toolchain)

## Installation

```bash
git clone https://github.com/DranxX/Drxporter.git
cd Drxporter
npm install
```

## Build

### Build Everything

```bash
npm run build:all
```

This produces:
- `output/roblox-plugin/drxporter-plugin.rbxmx` — Install this in Roblox Studio
- `output/vscode-binary/drxporter` — Linux/macOS bridge binary
- `output/vscode-binary/drxporter-windows.exe` — The Windows bridge executable

### Build Plugin Only

```bash
npm run build:plugin
```

Output:
- `output/roblox-plugin/drxporter-plugin.rbxmx`

### Build Linux/macOS Binary

```bash
npm run build:binary
```

Output:
- `output/vscode-binary/drxporter`

### Build Windows Binary

```bash
npm run build:binary -- --windows
```

Output:
- `output/vscode-binary/drxporter-windows.exe`

The `--windows` build uses `@yao-pkg/pkg` to package the Node.js bridge into a Windows executable. The generated target follows your current machine architecture:
- `x64` host → `node20-win-x64`
- `arm64` host → `node20-win-arm64`

If you are inside WSL, use the Linux/macOS binary (`output/vscode-binary/drxporter`). Running the Windows executable from WSL goes through WSLInterop and uses the Windows network stack, so Linux tools like `lsof` may not show the process that is blocking a port.

If Windows reports `EADDRINUSE` even though nothing appears in `netstat`, the port may be reserved by Windows rather than used by a normal process. Check reserved ranges with:

```bat
netsh interface ipv4 show excludedportrange protocol=tcp
```

## Usage

### 1. Start the Bridge Server

Linux/macOS:

```bash
./output/vscode-binary/drxporter
```

Windows PowerShell:

```powershell
.\drxporter-windows.exe
```

The bridge starts on `127.0.0.1:51234` by default. If `51234` is unavailable, DrXporter automatically tries `51235`, `51236`, and so on.

You can choose the starting port manually:

```powershell
.\drxporter-windows.exe --port 51234
```

Make sure the port in the Roblox plugin connect screen matches the port printed by the bridge server. If the bridge logs `Bridge server listening on 127.0.0.1:51235`, enter `51235` in the plugin.

For development with hot-reload:

```bash
npm run dev
```

### 2. Connect from Roblox Studio

1. Install the plugin (`drxporter-plugin.rbxmx`) in Roblox Studio.
2. Open the DrXporter widget (it docks to the right panel).
3. Click **Connect** — the plugin will connect to the local bridge server.

### 3. Export

Select instances in the Explorer tree within the plugin UI, choose which properties to include, and hit Export. Scripts and instance data will be written to your local workspace.

### 4. Edit & Sync

Edit the exported `.lua` files in any editor. Changes are automatically detected by the file watcher and synced back to Studio. Edits made in Studio are also pushed to the local files.

## Project Structure

```
drxporter/
├── roblox-plugin/          # Roblox Studio plugin (Luau)
│   ├── src/plugin/         # Plugin source
│   │   ├── ui/             # UI components and views
│   │   ├── serializer/     # Instance → file serialization
│   │   ├── deserializer/   # File → instance deserialization
│   │   └── diagnostics/    # Error codes and reporting
│   ├── test/               # Plugin tests
│   └── scripts/            # Build and packaging scripts
├── vscode-binary/          # Local bridge server (TypeScript)
│   ├── src/
│   │   ├── bridge/         # HTTP server, router, handlers
│   │   ├── cache/          # Cache store, UUID index
│   │   ├── workspace/      # Filesystem layout and tree operations
│   │   ├── exporter/       # Script and instance export logic
│   │   ├── importer/       # Script and instance import logic
│   │   ├── serialization/  # JSON serialization for instances
│   │   └── diagnostics/    # Error codes and reporting
│   └── test/               # Binary tests
├── shared/                 # Shared types, schemas, and validation
│   └── src/
│       ├── types/          # TypeScript type definitions
│       ├── schema/         # Instance, cache, and settings schemas
│       ├── validation/     # Schema and property validation
│       ├── mapping/        # File naming and parent resolution
│       └── constants/      # Shared constants
├── scripts/                # Root build orchestration
└── output/                 # Build artifacts
```

## Configuration

The bridge server defaults:

| Setting | Default |
|---|---|
| Host | `127.0.0.1` |
| Port | `51234` |
| Protocol Version | `1.0.0` |

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
