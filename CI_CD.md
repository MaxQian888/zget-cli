# CI/CD Guide

This document defines how continuous integration and release conventions should be applied in this template.

## Workflow Overview

- Quality workflow: `.github/workflows/ci.yml`
- Release workflow: `.github/workflows/release.yml`
- Go lint workflow: `.github/workflows/go-lint.yml`

### Trigger Strategy

- `CI`: push to `main` / `master`
- `CI`: pull requests targeting the default branch
- `Release`: push tags matching `v*.*.*`
- `Go Lint`: push / pull request, only runs `golangci-lint` when at least one `go.mod` exists

### CI Pipeline Steps

1. Checkout repository
2. Setup pnpm
3. Setup Node.js with pnpm cache
4. Install dependencies (`pnpm install --frozen-lockfile`)
5. Execute lint and format checks (`pnpm test`)
6. Execute component tests with coverage (`pnpm test:components:coverage`)
7. Execute core tests with coverage (`pnpm test:core:coverage`)
8. Execute command tests with coverage (`pnpm test:commands:coverage`)
9. Execute docs tests with coverage (`pnpm test:docs:coverage`)
10. Execute docs freshness check (`pnpm docs:check`)
11. Execute compile check (`pnpm build:check`)
12. Build distributable (`pnpm build`)
13. Smoke test built CLI (`pnpm smoke`)
14. Verify npm package can be packed (`pnpm pack:check`)

### Release Pipeline Steps

1. Checkout tagged commit
2. Install dependencies with the same Node.js / pnpm baseline as CI
3. Validate that the pushed tag matches `package.json` version (`pnpm release:assert-version <tag>`)
4. Re-run full quality, build, smoke, and packaging verification (`pnpm release:verify`)
5. Generate npm publish artifact (`pnpm pack`)
6. Archive `dist/` as a release asset
7. Publish the package to npm using `NPM_TOKEN`
8. Create or update the GitHub Release and upload both assets

### Go Lint Pipeline Steps

1. Checkout repository
2. Detect whether the repo currently contains any Go modules
3. If `go.mod` exists, run `golangci-lint` inside the official Docker image for each module
4. If no Go module exists, skip the lint job without failing the Node.js pipeline

## Branch Protection Recommendations

Configure repository rules for default branch:

- Require CI status check (`CI / quality`)
- Require pull request before merge
- Require at least one approving review
- Disallow force pushes

## Local Entry Points

- Fast local pre-push gate: `pnpm ci:local`
- Full CI parity gate: `pnpm verify:ci`
- Release-only version check: `pnpm release:assert-version vX.Y.Z`
- Release parity gate: `pnpm release:verify`

## Release Strategy

1. Update `CHANGELOG.md`
2. Bump `package.json` version
3. Run `pnpm verify:ci`
4. Merge to `main` / `master` after CI passes
5. Create and push a release tag (`vX.Y.Z`)
6. Let `.github/workflows/release.yml` publish npm and upload:
   - `zget-cli-X.Y.Z.tgz`
   - `zget-cli-vX.Y.Z-dist.tar.gz`

## Secrets and Tokens

For npm publishing, add:

- `NPM_TOKEN`

GitHub release automation uses:

- `GITHUB_TOKEN` (provided by Actions by default)

## Stability Guidelines

- Keep CI deterministic and minimal.
- Keep quality and release responsibilities in separate workflow files.
- Keep the tag version and `package.json` version identical.
