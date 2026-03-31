# Automatic Doc Generation Rollout Note

## What Changed

- Added a generated reference-doc pipeline under `docs/reference/`.
- Added shared CLI metadata in `source/cli-metadata.ts` so runtime help and generated docs use the same contract.
- Added TypeDoc markdown generation for the exported TypeScript API.
- Added CLI reference and tooling-baseline generators.
- Added docs freshness checks, docs-focused tests, Ink output tests, and coverage enforcement.
- Added CI gates for docs coverage and generated-doc drift.

## Standard Commands

```bash
pnpm test
pnpm test:docs
pnpm test:docs:coverage
pnpm docs:generate
pnpm docs:check
pnpm build
node dist/cli.js --name=Jane
```

## Rollback Steps

1. Remove docs pipeline scripts from `package.json`.
2. Remove docs tooling dependencies (`typedoc`, `typedoc-plugin-markdown`, `vitest`, `@vitest/coverage-v8`, `ink-testing-library`, `tsx`).
3. Remove `tools/docs/`, `tests/docs/`, and generated files under `docs/reference/`.
4. Restore CI to the previous `pnpm test` + `pnpm build` path.
5. Keep the manually maintained docs set until a replacement pipeline is ready.
