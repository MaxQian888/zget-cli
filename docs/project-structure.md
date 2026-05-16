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

  - One component per command family. Each platform that supports account/login splits its surface across `browse` / `interact` / `download` / `login` (and `publish` where applicable).
  - Zhihu (top-level + namespaced):
    - `download.tsx`, `column.tsx`, `user.tsx` — single-item, column batch, and user batch downloads
    - `browse.tsx` — top-level browse commands (`search`, `hot`, `question`, `answers`, `feed`, `topic`, `user-info`, `user-answers`, `user-articles`)
    - `login.tsx` — Zhihu QR code login
    - `zhihu-account.tsx` — `zhihu login | logout | status | whoami`
    - `zhihu-interact.tsx` — `vote`, `follow`, `comment(s)`, `uncomment`
    - `zhihu-list.tsx` — `followers`, `following`, `collections`, `notifications`, `drafts`
    - `zhihu-publish.tsx` — `ask`, `pin`, `publish-article`
    - `zhihu-delete.tsx` — `delete-question`, `delete-pin`, `delete-article`
  - Interactive shell:
    - `ui-home.tsx` — no-argument interactive home
    - `ui-account-center.tsx` — unified account overview
    - `ui-account-platform.tsx` — platform detail view for account actions
  - Platform packs (`<platform>-{browse,interact,download,login[,publish]}.tsx`):
    - `x-*.tsx` — X (Twitter)
    - `xhs-*.tsx` — 小红书 (includes `xhs-publish.tsx`)
    - `bili-*.tsx` — 哔哩哔哩
    - `weibo-*.tsx` — 微博 (includes `weibo-publish.tsx`)
    - `hn-*.tsx` — Hacker News (includes `hn-publish.tsx`)
    - `v2ex-*.tsx` — V2EX (includes `v2ex-publish.tsx`)
    - `reddit-*.tsx` — Reddit (includes `reddit-publish.tsx`)
  - Cross-platform:
    - `platform-download.tsx` — CSDN / WeChat / Juejin download
    - `summary.tsx` — AI summary
    - `types.ts` — shared command type definitions (`CommandName`, `ResolvedCommand`, `GlobalFlags`)

- `source/components/`

  - Reusable Ink UI components
  - `batch-progress.tsx`, `download-progress.tsx`, `error-display.tsx`, `interact-result.tsx`, `content-preview.tsx`, `qr-code.tsx`, `status-line.tsx`

- `source/core/`

  - Platform-agnostic business logic, organized by domain:
  - `core/api/` — HTTP clients for each platform (Zhihu, Bilibili, X, XHS, Weibo, Hacker News, V2EX, Reddit) plus Playwright drivers for XHS and HN
  - `core/account/` — normalized account probes, snapshots, and actions for the interactive account center
  - `core/auth/` — Cookie stores and auth flows per platform (one file per platform plus the shared `cookie-store.ts` and `qr-login.ts`)
  - `core/downloader/` — Download orchestration and per-platform downloader implementations (`platforms/`)
  - `core/parser/` — HTML-to-Markdown conversion and per-platform parse rules (`platforms/`)
  - `core/ai/` — AI config store, content extractor, and summarizer
  - `core/state/` — Batch download resume tracker
  - `core/utils/` — `config.ts` (cookie/credential file paths), `url-parser.ts`, `url-resolver.ts`, `exit-codes.ts`, `ink-app.ts`, `headers.ts`, `file-naming.ts`

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

- `workflows/ci.yml` — quality gate (lint + four test suites with coverage + docs drift + build + smoke + pack)
- `workflows/release.yml` — tag-triggered npm publish + GitHub Release asset upload
- Pull request and issue templates

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
