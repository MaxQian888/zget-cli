# CLI Design

This document explains the current CLI architecture and extension strategy.

## Runtime Flow

1. User executes `dist/cli.js`
2. `source/cli.tsx` reads shared CLI metadata from `source/cli-metadata.ts`
3. `meow` parses arguments using the shared contract
4. Parsed flags are transformed into app props
5. `render(<App ... />)` mounts Ink UI
6. `source/app.tsx` returns terminal output

## Separation of Concerns

### `cli.tsx`

Responsibilities:

- Option schema wiring
- Shared usage/help text wiring
- Input normalization
- App bootstrapping

Should avoid:

- Heavy rendering logic
- Business formatting details

### `app.tsx`

Responsibilities:

- Rendering output components
- Handling presentation state
- Defining user-facing text structure

Should avoid:

- Process-level argument parsing
- Direct environment orchestration unless explicitly required

## Design Principles

- Keep command surface minimal.
- Prefer explicit options over hidden defaults.
- Keep UI components pure and prop-driven.
- Make help/usage text match actual behavior.
- Keep runtime help and generated docs sourced from the same metadata.

## Extension Pattern

When adding a new option:

1. Add or update metadata in `source/cli-metadata.ts`.
2. Wire parser usage in `source/cli.tsx`.
3. Pass normalized value into `App` props.
4. Update `app.tsx` rendering.
5. Regenerate docs with `pnpm docs:generate`.
6. Update changelog if behavior changed.

## Example Extension Checklist

- [ ] Option defined in parser
- [ ] Option documented in README
- [ ] Behavior reflected in app render output
- [ ] `pnpm test` and `pnpm build` pass
- [ ] Smoke command demonstrates new behavior

## Backward Compatibility Guidance

For existing options:

- Do not change semantics silently.
- If defaults change, document migration notes.
- Include change rationale in `CHANGELOG.md`.
