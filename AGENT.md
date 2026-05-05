# zget-cli — Agent Integration

> **This file is a pointer.** The canonical agent and developer contract lives in [`CLAUDE.md`](./CLAUDE.md).

If you are an AI agent invoking `zget` programmatically, read the **"Agent-Facing Runtime Contract"** section of [`CLAUDE.md`](./CLAUDE.md#agent-facing-runtime-contract). It covers:

- Quick start for agents (`--format json`, namespaced help, auth probing)
- Per-platform auth model and persisted credential paths
- Stable JSON output envelope (`{ ok, data | error }`) and migration notes for legacy shapes
- Exit codes (sysexits.h subset) and retry/branching guidance
- Known constraints (Playwright overhead, QR window, rate limits, image counts)
- Pipe-friendly composability examples

If you are working **on** the codebase (not invoking the CLI), the rest of `CLAUDE.md` covers build, test, architecture, and extension points.

Keep this file and `CLAUDE.md` in sync — when the agent contract changes, update `CLAUDE.md` and leave this pointer alone.
