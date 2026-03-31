---
name: using-zget-cli
description: Use when operating or smoke-testing the `zget` CLI in this repository, mapping a platform or content task to the right command, checking whether auth or AI-summary prerequisites are needed, or deciding between URL auto-detection and explicit subcommands.
---

# Using zget CLI

Operate this repo's CLI from code truth, not memory. Prefer running the real command over paraphrasing usage from stale docs.

## Start Here

1. Choose the runtime path:
   - Use `pnpm dev -- <args>` when validating the current source tree.
   - Use `node dist/cli.js <args>` only after a fresh `pnpm build`.
2. Check command truth before guessing:
   - Help text lives in `source/cli-metadata.ts`.
   - Routing and URL auto-detection live in `source/cli.tsx`.
   - Detailed task-to-command mappings live in [references/command-workflows.md](references/command-workflows.md).
3. Treat config and auth storage as runtime truth from `source/core/utils/config.ts`, not from older doc snippets.

## Decision Rules

- If the user provides a supported content URL and wants a download, prefer `zget <url>` first.
- If the user wants search, feeds, profiles, followers, metrics, or interaction actions, use the explicit platform subcommand family.
- If the command mutates remote state or needs private data, verify the auth path first instead of letting the task fail late.
- If the task is AI summary, check runtime AI config inputs before invoking `zget summary <url>`.
- If the request is about extending or debugging CLI implementation, use this skill only for runtime truth; follow repo docs and repo skills for code changes.

## Auth And Config Guardrails

- Zhihu login uses `zget login`.
- X uses `zget x login`, but runtime truth is env/config-backed credentials rather than a browser login flow.
- Xiaohongshu uses `zget xhs login` and depends on Playwright Chromium for browser automation.
- Bilibili uses `zget bili login`.
- Runtime state lives under `~/.zget-cli`, including cookies, platform credentials, and `ai-config.json`.
- When docs disagree with runtime behavior, prefer `source/core/utils/config.ts`, `source/core/auth/*.ts`, and `source/core/ai/ai-config.ts`.

## Verification

- For usage help or bug repro, run the exact command you recommend with `pnpm dev -- ...` and read the real output.
- For built CLI smoke checks, run `pnpm build` and then `node dist/cli.js --help`.
- For repo changes that touch command behavior, use the repo gates from `docs/quality-gates.md`:
  - `pnpm test`
  - `pnpm test:docs`
  - `pnpm docs:generate`
  - `pnpm docs:check`
  - `pnpm build`
  - `node dist/cli.js --help`
