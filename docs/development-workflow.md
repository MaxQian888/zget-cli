# Development Workflow

This workflow keeps local development aligned with CI and template governance.

## Phase 1: Setup

```bash
pnpm install
```

## Phase 2: Implement

- Edit code under `source/`.
- Use watch mode for rapid feedback:

```bash
pnpm dev
```

## Phase 3: Validate

Run checks in this order:

```bash
pnpm test
pnpm test:docs
pnpm docs:generate
pnpm docs:check
pnpm build
node dist/cli.js --name=Jane
```

## Phase 4: Document

If behavior changed, update at least one of:

- `README.md` / `README_zh.md`
- `docs/cli-design.md`
- `docs/reference/README.md`
- `docs/troubleshooting.md`
- `CHANGELOG.md`

## Phase 5: Submit

1. Commit with clear scope.
2. Open PR using template.
3. Include validation evidence.

## Done Criteria

A change is considered complete when:

- `pnpm test` passes
- `pnpm test:docs` passes
- `pnpm docs:check` passes
- `pnpm build` passes
- Smoke run returns expected behavior
- Related docs are updated
- CI passes on PR

## Suggested Daily Command Set

```bash
pnpm test && pnpm test:docs && pnpm docs:check && pnpm build && node dist/cli.js --name=Jane
```
