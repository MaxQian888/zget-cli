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
pnpm ci:local
```

Before pushing a release tag, run the full CI parity gate:

```bash
pnpm verify:ci
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

- `pnpm ci:local` passes
- `pnpm verify:ci` passes before a release tag
- Related docs are updated
- CI passes on PR

## Suggested Daily Command Set

```bash
pnpm ci:local
```
