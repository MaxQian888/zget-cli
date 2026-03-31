# Testing Guide

This template uses a lightweight but strict validation model suitable for CLI starter projects.

## Validation Layers

| Layer            | Command                        | Purpose                                                                        |
| ---------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| Formatting       | `pnpm format:check`            | Ensure repository-wide style consistency                                       |
| Lint             | `pnpm lint`                    | Catch code quality and correctness issues                                      |
| Aggregated check | `pnpm test`                    | Run formatting + lint in one command                                           |
| Docs tests       | `pnpm test:docs`               | Validate docs helpers, generated markdown invariants, and Ink output contracts |
| Docs coverage    | `pnpm test:docs:coverage`      | Enforce docs-pipeline coverage thresholds                                      |
| Docs freshness   | `pnpm docs:check`              | Ensure committed generated docs match current source                           |
| Docs generation  | `pnpm docs:generate`           | Refresh generated docs under `docs/reference/`                                 |
| Compile          | `pnpm build`                   | Verify TypeScript compiles to `dist/`                                          |
| Smoke            | `node dist/cli.js --name=Jane` | Validate runtime behavior                                                      |

## Standard Local Validation Sequence

Run the following before creating a PR:

```bash
pnpm test
pnpm test:docs
pnpm docs:generate
pnpm docs:check
pnpm build
node dist/cli.js --name=Jane
```

Expected smoke output:

```text
Hello, Jane
```

## Failure Triage

### `pnpm test` fails

1. If formatting errors appear:

```bash
pnpm format
```

2. Re-run:

```bash
pnpm test
```

3. If lint still fails, fix the reported files and run `pnpm test` again.

### `pnpm build` fails

- Review TypeScript error output.
- Ensure ESM import paths are correct (for example `./app.js` from TypeScript sources when using `nodenext`).
- Re-run build after fixing type/import issues.

### `pnpm test:docs` or `pnpm docs:check` fails

- Run `pnpm docs:generate`.
- Review generated files under `docs/reference/`.
- Re-run `pnpm test:docs` and `pnpm docs:check`.
- If CLI reference assertions fail, inspect `source/cli-metadata.ts`.

### Smoke test fails

- Ensure `pnpm build` was executed.
- Verify `dist/cli.js` exists.
- Run command with explicit option and check output.

## CI Parity

CI executes the same quality flow:

- `pnpm install --frozen-lockfile`
- `pnpm test`
- `pnpm test:docs:coverage`
- `pnpm docs:check`
- `pnpm build`

Keep local validation aligned with CI to reduce PR churn.
