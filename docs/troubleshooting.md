# Troubleshooting

## `pnpm test` fails on formatting

- Run `pnpm format`.
- Re-run `pnpm test`.
- Generated reference docs under `docs/reference/` are intentionally excluded from Prettier checks.

## `pnpm test:docs` fails

- Read the failing test name first. Docs tests are split between:
  - CLI contract metadata
  - Generated markdown invariants and snapshots
  - Ink output rendering
  - Generated docs diff detection
- If snapshots or invariants failed after a real behavior change, regenerate docs with `pnpm docs:generate` and review the diff.

## `pnpm docs:generate` fails

- Confirm dependencies are installed with `pnpm install`.
- Confirm Node.js 20+ is active.
- If TypeDoc reports output-path or configuration issues, inspect `typedoc.json` first.
- If CLI reference generation fails, inspect `source/cli-metadata.ts` and `tools/docs/`.

## `pnpm docs:check` fails

- Run `pnpm docs:generate`.
- Review changes under `docs/reference/`.
- Re-run `pnpm docs:check` to confirm no drift remains.

## `pnpm build` fails

- Check TypeScript output first.
- For CLI contract issues, inspect `source/cli.tsx`, `source/cli-metadata.ts`, and `source/index.ts`.
- For docs tooling import issues, inspect `tools/docs/` and `tsconfig.tools.json`.

## Smoke output is wrong

- Rebuild with `pnpm build`.
- Run `node dist/cli.js --name=Jane`.
- If the output differs from docs or tests, update the shared CLI contract in `source/cli-metadata.ts` first.
