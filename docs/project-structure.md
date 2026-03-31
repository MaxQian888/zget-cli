# Project Structure

This document explains ownership boundaries and intent for each major file and directory.

## Directory Overview

```text
react-cli-quick-starter/
├── source/
├── tests/
├── tools/
├── docs/
├── .github/
├── package.json
├── tsconfig.json
├── tsconfig.tools.json
└── ...
```

### `source/`

Implementation layer for runtime behavior.

- `source/cli.tsx`
  - Process entrypoint
  - CLI option parsing and normalization
  - App rendering bootstrapping
- `source/cli-metadata.ts`
  - Shared CLI contract
  - Runtime help text source
  - Generated docs source metadata
- `source/app.tsx`
  - Ink component tree
  - Presentation logic for CLI output

### `tests/`

Validation for runtime and docs pipeline behavior.

- `tests/cli/`
  - Ink output contract tests
- `tests/docs/`
  - Docs helper tests
  - Generated markdown invariants and snapshots

### `tools/`

Repository automation scripts.

- `tools/docs/`
  - Docs generation entrypoints
  - Generated docs diff detection
  - Tooling baseline generation

### `docs/`

Architecture and process documentation.

- Workflow and structure docs
- Quality and troubleshooting references
- Generated reference docs under `docs/reference/`
- Release and maintenance playbooks

### `.github/`

Repository collaboration and automation assets.

- CI workflow
- Issue templates
- Pull request template

## Root File Responsibilities

- `package.json`
  - Scripts
  - Dependency policy
  - lint/format configuration
- `tsconfig.json`
  - Compile target and module strategy
- `tsconfig.tools.json`
  - Type-aware config for docs tooling and tests
- `README.md` / `README_zh.md`
  - Entry documentation for users and maintainers
- `CONTRIBUTING.md`
  - Collaboration contract
- `TESTING.md`
  - Validation contract
- `CI_CD.md`
  - CI/release conventions
- `CHANGELOG.md`
  - User-visible change history

## Build Artifact Boundary

- `dist/` is generated output.
- Do not hand-edit generated files.
- Always rebuild from `source/` using `pnpm build`.

## Extension Guidance

When adding new features:

1. Keep CLI parsing concerns in `cli.tsx`.
2. Keep shared CLI contract concerns in `cli-metadata.ts`.
3. Keep rendering concerns in `app.tsx`.
4. Add docs updates in the same PR.
5. Preserve existing script contracts unless intentionally changing project policy.
