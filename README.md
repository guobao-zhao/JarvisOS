# JarvisOS

Local-first AI operating system for Jarvis, the intelligent butler.

## Development

```bash
bun install
bun run dev:desktop
```

## JarvisOS v0.8 status

JarvisOS is a local-first desktop AI operating system for Jarvis. Current capabilities include Core Chat, Memory recall/write, Metrics HUD, intelligent model routing, Tools registry foundation, Growth Engine scanning, local intelligence briefing, and read-only Jarvis migration preview/import.

Known incomplete areas:
- MCP-backed Tools library expansion
- Fully automated intelligence collection
- Production packaging and installer signing
- Voice latency and model download UX

## Growth Engine

JarvisOS Growth Engine can scan old Jarvis assets in read-only mode and generate a migration growth report.

```bash
# Growth source root can now be set in the Growth panel UI,
# or via the JARVIS_GROWTH_SOURCE_ROOT environment variable:
JARVIS_GROWTH_SOURCE_ROOT=/path/to/Jarvis bun run dev:desktop
```

Growth v1 does not modify old Jarvis assets, does not enable candidate tools automatically, and blocks high-risk external write capabilities from sandbox execution.

## Intelligent Model Routing

JarvisOS supports multiple OpenAI-compatible model profiles. Open the Model Pulse card in the Holographic Hub to configure profiles, bind roles, test connections, and save routing changes.

Default routing is phase-aware: daily chat can use the daily/worker model, while clarification, design, debugging, review, and repeated failures can route to designer/reviewer models. Every decision is broadcast to the UI with phase, role, selected model, confidence, and reason. Task windows show a model timeline and allow per-task overrides with Pin GPT, Pin Kimi, or Auto.

## Architecture

Forked from the OpenCode desktop skeleton, customized and extended for JarvisOS.
