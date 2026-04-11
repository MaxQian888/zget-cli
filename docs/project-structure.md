# Project Structure

This document explains ownership boundaries and intent for each major file and directory.

## Directory Overview

```text
zget-cli/
├── source/
│   ├── cli.tsx
│   ├── cli-metadata.ts
│   ├── app.tsx
│   ├── index.ts
│   ├── commands/
│   ├── components/
│   ├── core/
│   └── types/
├── tools/
├── docs/
├── .github/
├── .agents/
├── package.json
├── tsconfig.json
├── tsconfig.tools.json
└── typedoc.json
```

### `source/`

Implementation layer for all runtime behavior.

- `source/cli.tsx`

  - Process entrypoint
  - CLI argument parsing and normalization via `meow`
  - URL auto-detection and command routing
  - App rendering bootstrapping via Ink

- `source/cli-metadata.ts`

  - Shared CLI contract (flag definitions, help text)
  - Runtime help text source
  - Generated docs source metadata

- `source/app.tsx`

  - Top-level Ink component tree
  - Routes resolved commands to the right command component

- `source/commands/`

  - One component per command family
  - `download.tsx` — Zhihu single-item download
  - `column.tsx` — Zhihu column batch download
  - `user.tsx` — Zhihu user batch download
  - `browse.tsx` — Zhihu browse commands
  - `platform-download.tsx` — CSDN / WeChat / Juejin download
  - `login.tsx` — Zhihu QR code login
  - `ui-home.tsx` — no-argument interactive home shell
  - `ui-account-center.tsx` — unified account overview
  - `ui-account-platform.tsx` — platform detail view for account actions
  - `x-browse.tsx`, `x-interact.tsx`, `x-download.tsx`, `x-login.tsx` — X (Twitter)
  - `xhs-browse.tsx`, `xhs-interact.tsx`, `xhs-download.tsx`, `xhs-login.tsx`, `xhs-publish.tsx` — XHS
  - `bili-browse.tsx`, `bili-interact.tsx`, `bili-download.tsx`, `bili-login.tsx` — Bilibili
  - `summary.tsx` — AI summary
  - `types.ts` — shared command type definitions

- `source/components/`

  - Reusable Ink UI components
  - `batch-progress.tsx`, `download-progress.tsx`, `error-display.tsx`, `interact-result.tsx`, `content-preview.tsx`, `qr-code.tsx`, `status-line.tsx`

- `source/core/`

  - Platform-agnostic business logic, organized by domain:
  - `core/api/` — HTTP clients for each platform (Zhihu, X, XHS, Bilibili)
  - `core/account/` — normalized account probes, snapshots, and actions for the interactive account center
  - `core/auth/` — Cookie stores and auth flows per platform
  - `core/downloader/` — Download orchestration and per-platform downloader implementations
  - `core/parser/` — HTML-to-Markdown conversion and per-platform parse rules
  - `core/ai/` — AI config store and summarizer
  - `core/state/` — Batch download resume tracker
  - `core/utils/` — Config paths, URL parser, file naming, HTTP headers

- `source/types/`
  - Shared TypeScript type definitions (AI, Bilibili, third-party module declarations)

### `tools/`

Repository automation scripts.

- `tools/docs/` — Docs generation entrypoints and diff detection
- `tools/git-hooks/` — Commit message validation
- `tools/release/` — Release tag validation and npm pack verification

### `docs/`

Architecture and process documentation.

- Workflow and structure docs
- Quality and troubleshooting references
- Generated reference docs under `docs/reference/`
- Release and maintenance playbooks

### `.github/`

Repository collaboration and automation assets.

- CI workflow
- Release workflow
- Pull request template

### `.agents/`

Agent skills for operating this repository.

- `.agents/skills/using-zget-cli/` — Command workflow reference for AI agents
- `.agents/skills/ink-expert/` — Ink v6 reference for UI development

## Root File Responsibilities

- `package.json` — Scripts, dependencies, lint/format config
- `tsconfig.json` — Compile target and module strategy
- `tsconfig.tools.json` — Type-aware config for docs tooling and tests
- `typedoc.json` — TypeDoc reference output configuration
- `README.md` / `README_zh.md` — Entry documentation for users and maintainers
- `CONTRIBUTING.md` — Collaboration contract
- `TESTING.md` — Validation contract
- `CI_CD.md` — CI/release conventions
- `CHANGELOG.md` — User-visible change history

## Build Artifact Boundary

- `dist/` is generated output.
- Do not hand-edit generated files.
- Always rebuild from `source/` using `pnpm build`.

## Extension Guidance

When adding new features:

1. Add the new command type to `source/commands/types.ts`.
2. Add routing in `source/cli.tsx`.
3. Create a new command component under `source/commands/`.
4. Register it in `source/app.tsx`.
5. Add business logic under `source/core/` in the appropriate domain subdirectory.
6. Update help text in `source/cli-metadata.ts`.
7. Update `README.md` and `docs/reference/cli.md` in the same PR.
