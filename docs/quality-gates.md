# Quality Gates

This repository uses layered quality gates so documentation, runtime behavior, and generated artifacts stay aligned.

## Required Local Checks

Run these before opening a PR:

```bash
pnpm test
pnpm test:docs
pnpm docs:generate
pnpm docs:check
pnpm build
node dist/cli.js --name=Jane
```

## Gate Definitions

| Gate              | Command                        | Purpose                                                                        |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| Formatting + lint | `pnpm test`                    | Validate repository style and static checks                                    |
| Docs tests        | `pnpm test:docs`               | Validate docs helpers, generated markdown invariants, and Ink output contracts |
| Docs coverage     | `pnpm test:docs:coverage`      | Enforce coverage thresholds for docs pipeline code                             |
| Docs freshness    | `pnpm docs:check`              | Fail if committed generated docs drift from current source                     |
| Build             | `pnpm build`                   | Ensure TypeScript compiles to `dist/`                                          |
| Smoke             | `node dist/cli.js --name=Jane` | Validate built CLI behavior                                                    |

## CI Contract

The main CI workflow runs the same gates that matter for merge:

```bash
pnpm test
pnpm test:docs:coverage
pnpm docs:check
pnpm build
```

## Generated Docs Policy

- Generated docs live under `docs/reference/`.
- Update them with `pnpm docs:generate`.
- Do not hand-edit generated reference files.
- Use `pnpm docs:check` to confirm committed docs still match source.
