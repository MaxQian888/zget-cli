---
name: ink-expert
description: Expert workflow for modern Ink CLI development and migration. Use when building React-based terminal apps with Ink, upgrading old Ink v4/v5 projects to v6+, implementing keyboard/paste/focus/cursor behavior, integrating @inkjs/ui components, or debugging/testing interactive CLI rendering in local and CI environments.
---

# Ink Expert

Build and troubleshoot production-grade Ink CLIs with current APIs and version-aware migration steps.
Treat this skill as the default path when a task includes Ink architecture, interactive terminal UX, or Ink testing.

## Start Here

1. Classify the request:
   - New project bootstrap.
   - Existing project migration.
   - Feature implementation.
   - Debugging or test failures.
2. Read [references/official-sources.md](references/official-sources.md) first for the verified version baseline.
3. Read only the reference file needed for the current subtask:
   - API surface: [references/api-v6.md](references/api-v6.md)
   - Bootstrapping or migration: [references/bootstrap-and-migration.md](references/bootstrap-and-migration.md)
   - Testing or rendering/debug behavior: [references/testing-and-debugging.md](references/testing-and-debugging.md)
   - Component ecosystem decisions: [references/component-ecosystem.md](references/component-ecosystem.md)\n   - Legacy source reconciliation: [references/legacy-merge-map.md](references/legacy-merge-map.md)

## Workflow

### 1. Confirm Runtime and Dependency Baseline

Run version checks before writing or changing code:

```bash
node -v
npm ls ink react --depth=0
```

If `ink` is below `6.x` or `react` is below `19.x`, treat it as a migration task and use [references/bootstrap-and-migration.md](references/bootstrap-and-migration.md).

### 2. Choose Bootstrap Strategy

- Prefer direct modern setup or a template that already targets Ink v6 + React 19.
- If using `create-ink-app`, treat it as a shell scaffold and immediately upgrade dependencies because its shipped templates can lag behind latest Ink.
- Keep ESM (`"type": "module"`) and verify Node engine compatibility.

### 3. Implement UI with Ink Core + Stable Patterns

- Use core primitives first: `<Box>`, `<Text>`, `<Static>`, `<Spacer>`, `<Transform>`, `<Newline>`.
- For input-heavy flows, combine:
  - `useInput` for key events and navigation.
  - `usePaste` for full pasted payload handling.
  - `useFocus`/`useFocusManager` for keyboard-accessible focus models.
- For terminal-aware layout and cursor behavior, use:
  - `useBoxMetrics` for measured width/height/position.
  - `useWindowSize` for responsive layout.
  - `useCursor` for IME and cursor placement correctness.

### 4. Configure Render Behavior Deliberately

Use `render()` options according to environment:

- Interactive local app: keep `interactive: true` (default in TTY).
- CI or piped output: understand non-interactive behavior and final-frame-only semantics.
- Enable `kittyKeyboard` only when you need richer key semantics (`eventType`, extra modifiers).
- Use `concurrent: true` only when you rely on Suspense/transitions and are ready for changed render timing.

For static output generation (docs, file output, deterministic snapshots), use `renderToString()` instead of `render()`.

### 5. Test and Debug Before Claiming Done

- Use `ink-testing-library` for frame-level assertions and stdin simulation.
- Prefer focused behavior assertions:
  - navigation
  - submit/cancel
  - paste handling
  - resize/reflow behavior
- Add one CI-safe non-interactive test path for commands that may run in pipelines.
- Use [references/testing-and-debugging.md](references/testing-and-debugging.md) for checklists and failure triage.

## Implementation Rules

- Keep user-facing text in `<Text>` nodes.
- Avoid mixing `console.*` with ad-hoc terminal writes unless behavior is intentional.
- Guard all terminal-specific behavior for non-interactive mode.
- For migration PRs, separate dependency upgrades from behavior changes when possible.
- Treat unverified "latest API" claims as stale until checked against [references/official-sources.md](references/official-sources.md).

## Output Expectations

When using this skill to deliver code or guidance, produce:

1. The detected version matrix (`node`, `ink`, `react`).
2. The chosen path (new build vs migration).
3. The specific APIs used (`useInput`, `usePaste`, `useBoxMetrics`, etc.).
4. The tests run and what behavior they validate.
5. Any remaining blockers (for example terminal capability limitations).

