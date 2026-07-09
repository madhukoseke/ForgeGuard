# ForgeGuard diagrams

Architecture and pipeline diagrams for [ARCHITECTURE.md](../ARCHITECTURE.md), the README, and presentations.

| File | Description |
|------|-------------|
| [forgeguard-architecture.png](./forgeguard-architecture.png) | Agent → MCP/HTTP → two guards → backends (exported) |
| [forgeguard-guard-pipeline.png](./forgeguard-guard-pipeline.png) | Data-path classify → apply / hold (exported) |
| [forgeguard-architecture.excalidraw](./forgeguard-architecture.excalidraw) | Editable Excalidraw source (system overview) |
| [forgeguard-guard-pipeline.excalidraw](./forgeguard-guard-pipeline.excalidraw) | Editable Excalidraw source (pipeline) |

Prefer the PNGs in docs. Re-export from Excalidraw (or regenerate from the mermaid in ARCHITECTURE.md) when the layout changes.

## Open Excalidraw sources

1. Go to [excalidraw.com](https://excalidraw.com)
2. **Open** → select the `.excalidraw` file, or drag it onto the canvas
3. Or install the [Excalidraw VS Code extension](https://marketplace.visualstudio.com/items?itemName=pomdtr.excalidraw-editor) and open the file in the repo
