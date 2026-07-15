# JarvisOS v0.8 Release Checklist

## Automated checks

- [ ] `bun run --cwd /Users/Zhuanz/JarvisOS typecheck`
- [ ] `cd /Users/Zhuanz/JarvisOS && bun test ./packages/growth/src/__tests__/*.test.ts ./packages/tools/src/__tests__/registry.test.ts ./packages/memory/src/__tests__/*.test.ts`
- [ ] `cd /Users/Zhuanz/JarvisOS && bun --cwd packages/desktop build`

## Manual desktop smoke test

- [ ] Launch with `cd /Users/Zhuanz/JarvisOS && bun run dev:desktop`
- [ ] Core Chat accepts a text message and renders a streamed assistant response.
- [ ] HUD renders System Pulse, Memory Pulse, Tool Matrix, Growth Engine, and Task Field.
- [ ] Growth source root can be set to `/Users/Zhuanz/Jarvis`.
- [ ] Growth scan completes and persists latest report.
- [ ] Candidate promotion approval writes a local decision record.
- [ ] Intelligence panel loads local intel excerpts or shows a safe empty state.
- [ ] Migration panel previews candidates from `/Users/Zhuanz/Jarvis`.
- [ ] Migration import does not modify files in `/Users/Zhuanz/Jarvis`.
- [ ] Voice controls render without blocking text chat.

## Files that must not be committed

- [ ] `.claude-*.png`
- [ ] `tools/**/pretrained_models/`
- [ ] `tools/**/*.wav`
- [ ] `__pycache__/`
- [ ] `.env` or `.env.local`

## Known limitations for v0.8

- MCP Tools library is still a foundation, not complete automation.
- Intelligence is local-file briefing, not full scheduled web collection.
- Growth promotion is approval recording, not automatic code installation.
- Packaging/signing requires a separate release pass.
