# Quality Gates

This repository uses layered quality gates so documentation, runtime behavior, and generated artifacts stay aligned.

## Required Local Checks

Run these before opening a PR:

```bash
pnpm ci:local
```

## Gate Definitions

| Gate               | Command                         | Purpose                                                                   |
| ------------------ | ------------------------------- | ------------------------------------------------------------------------- |
| Formatting + lint  | `pnpm test`                     | Validate repository style and static checks                               |
| Component coverage | `pnpm test:components:coverage` | Enforce 80%+ coverage for reusable Ink UI components                      |
| Core coverage      | `pnpm test:core:coverage`       | Enforce 80%+ coverage for the core unit-test surface under `source/core/` |
| Command coverage   | `pnpm test:commands:coverage`   | Enforce 80%+ coverage for command behavior under `source/commands/`       |
| Docs coverage      | `pnpm test:docs:coverage`       | Enforce coverage thresholds for docs pipeline code                        |
| Docs freshness     | `pnpm docs:check`               | Fail if committed generated docs drift from current source                |
| Type check         | `pnpm build:check`              | Validate TypeScript types before bundling                                 |
| Build              | `pnpm build`                    | Ensure TypeScript compiles to `dist/`                                     |
| Smoke              | `pnpm smoke`                    | Validate built CLI behavior                                               |
| Package            | `pnpm pack:check`               | Verify npm tarball creation works before release                          |

## CI Contract

The main CI workflow runs the same gates that matter for merge:

```bash
pnpm verify:ci
```

The release workflow reuses `pnpm release:verify` before publishing npm and uploading assets.

The separate `Go Lint` workflow runs `golangci-lint` in Docker only when the repository contains at least one `go.mod`.

## Generated Docs Policy

- Generated docs live under `docs/reference/`.
- Update them with `pnpm docs:generate`.
- Do not hand-edit generated reference files.
- Use `pnpm docs:check` to confirm committed docs still match source.
