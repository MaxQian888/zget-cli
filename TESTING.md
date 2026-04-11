# Testing Guide

This template uses a lightweight but strict validation model suitable for CLI starter projects.

## Validation Layers

| Layer              | Command                         | Purpose                                                                        |
| ------------------ | ------------------------------- | ------------------------------------------------------------------------------ |
| Formatting         | `pnpm format:check`             | Ensure repository-wide style consistency                                       |
| Lint               | `pnpm lint`                     | Catch code quality and correctness issues                                      |
| Aggregated check   | `pnpm test`                     | Run formatting + lint in one command                                           |
| Component tests    | `pnpm test:components`          | Validate reusable Ink UI component rendering and branch behavior               |
| Component coverage | `pnpm test:components:coverage` | Enforce 80%+ coverage for `source/components/`                                 |
| Core tests         | `pnpm test:core`                | Validate unit-tested `source/core` modules with targeted mocks and transforms  |
| Core coverage      | `pnpm test:core:coverage`       | Enforce 80%+ coverage for the core unit-test surface under `source/core/`      |
| Command tests      | `pnpm test:commands`            | Validate command routing and command-specific behavior                         |
| Command coverage   | `pnpm test:commands:coverage`   | Enforce 80%+ coverage for `source/commands/`                                   |
| Docs tests         | `pnpm test:docs`                | Validate docs helpers, generated markdown invariants, and Ink output contracts |
| Docs coverage      | `pnpm test:docs:coverage`       | Enforce docs-pipeline coverage thresholds                                      |
| Docs freshness     | `pnpm docs:check`               | Ensure committed generated docs match current source                           |
| Docs generation    | `pnpm docs:generate`            | Refresh generated docs under `docs/reference/`                                 |
| Type check         | `pnpm build:check`              | Verify TypeScript type safety before bundling                                  |
| Build              | `pnpm build`                    | Verify the CLI bundles to `dist/`                                              |
| Smoke              | `pnpm smoke`                    | Validate built CLI behavior                                                    |
| Package            | `pnpm pack:check`               | Verify npm tarball generation succeeds                                         |

## Standard Local Validation Sequence

Run the following before creating a PR:

```bash
pnpm test
pnpm test:components
pnpm test:core
pnpm test:commands
pnpm test:docs
pnpm docs:generate
pnpm docs:check
pnpm build:check
pnpm build
pnpm smoke
pnpm pack:check
```

Run this before cutting a release tag or when you want full CI parity:

```bash
pnpm verify:ci
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

- Review the esbuild error output first.
- Ensure the CLI entry and external dependency list in `package.json` still match runtime usage.
- Re-run build after fixing the reported bundle issue.

### `pnpm test:docs` or `pnpm docs:check` fails

- Run `pnpm docs:generate`.
- Review generated files under `docs/reference/`.
- Re-run `pnpm test:docs` and `pnpm docs:check`.
- If CLI reference assertions fail, inspect `source/cli-metadata.ts`.

### `pnpm test:commands` or `pnpm test:commands:coverage` fails

- Read the failing command branch in `source/commands/`.
- Tighten the matching `tests/source/commands/<command>.test.tsx`.
- Re-run the same command suite before widening verification.

### `pnpm test:components:coverage` fails

- Read the failing component branch in `source/components/`.
- Add or tighten the matching `tests/components/<component>.test.tsx`.
- Re-run `pnpm test:components:coverage` until all coverage thresholds pass.

### `pnpm test:core:coverage` fails

- Read the failing branch or uncovered file in `source/core/`.
- Tighten the matching `tests/core/<same-relative-path>.test.ts` or `.test.tsx`.
- Re-run `pnpm test:core:coverage` until all coverage thresholds pass.

### Smoke test fails

- Ensure `pnpm build` was executed.
- Verify `dist/cli.js` exists.
- Run command with explicit option and check output.

## CI Parity

CI executes the same quality flow:

- `pnpm install --frozen-lockfile`
- `pnpm test`
- `pnpm test:components:coverage`
- `pnpm test:core:coverage`
- `pnpm test:commands:coverage`
- `pnpm test:docs:coverage`
- `pnpm docs:check`
- `pnpm build:check`
- `pnpm build`
- `pnpm smoke`
- `pnpm pack:check`

Keep local validation aligned with CI to reduce PR churn.
