# CI/CD Guide

This document defines how continuous integration and release conventions should be applied in this template.

## CI Workflow Overview

Workflow file: `.github/workflows/ci.yml`

### Trigger Strategy

- Push to `main` / `master`
- Pull requests targeting default branch

### Current Pipeline Steps

1. Checkout repository
2. Setup Node.js
3. Setup pnpm
4. Install dependencies (`pnpm install --frozen-lockfile`)
5. Execute quality checks (`pnpm test`)
6. Execute docs tests with coverage (`pnpm test:docs:coverage`)
7. Execute docs freshness check (`pnpm docs:check`)
8. Execute compile check (`pnpm build`)

## Branch Protection Recommendations

Configure repository rules for default branch:

- Require CI status check (`CI / quality`)
- Require pull request before merge
- Require at least one approving review
- Disallow force pushes

## Release Strategy (Template Recommendation)

This template ships with CI only. For release automation, extend with a dedicated release workflow when needed.

Recommended release steps:

1. Update `CHANGELOG.md`
2. Bump `package.json` version
3. Run local validation (`pnpm test`, `pnpm test:docs`, `pnpm docs:check`, `pnpm build`)
4. Merge to default branch after CI passes
5. Create release tag (`vX.Y.Z`)
6. Publish package (if registry publishing is enabled)

## Secrets and Tokens (If Publishing)

For npm publishing pipelines, add:

- `NPM_TOKEN`

For GitHub release automation, optionally use:

- `GITHUB_TOKEN` (provided by Actions by default)

## Stability Guidelines

- Keep CI deterministic and minimal.
- Avoid adding unrelated jobs to core quality workflow.
- Prefer adding new jobs in separate workflow files when scope grows.
