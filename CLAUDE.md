# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`zget-cli` is an Ink-based React CLI (Node 20+, ESM, TypeScript) that downloads, browses, and (when authenticated) interacts with content across eleven Chinese/international platforms:

- **Read-only scrapers:** CSDN, WeChat (微信公众号), Juejin (掘金)
- **Authenticated read + interact + publish:** Zhihu (知乎), X (Twitter), 小红书 (XHS), Bilibili (哔哩哔哩), Weibo (微博), Hacker News, V2EX, Reddit

It also exposes an AI summary command across multiple LLM providers (OpenAI, Anthropic, DeepSeek, plus any OpenAI-compatible base URL). The package ships a single `zget` binary (`bin: dist/cli.js`).

Two more platforms (Douban, Bluesky) are scaffolded at the URL-parser and account-center level but do **not** yet have user-facing commands — treat them as work-in-progress, not part of the public surface.

Package manager: **pnpm** (frozen lockfile in CI). The `prepare` script installs `simple-git-hooks` automatically on `pnpm install`.

## Common Commands

```sh
pnpm install                  # install + simple-git-hooks setup
pnpm dev                      # run CLI from source via tsx (no bundle)
pnpm build                    # esbuild bundle source/cli.tsx → dist/cli.js
pnpm build:check              # tsc --noEmit type check
pnpm smoke                    # node dist/cli.js --help (post-build sanity)
pnpm pack:check               # verify npm pack tarball generation
```

### Lint / format

```sh
pnpm lint                     # xo (ESLint preset)
pnpm format                   # prettier --write .
pnpm format:check             # prettier --check .
pnpm test                     # alias: prettier --check . && xo (NOT a test runner)
```

Note the surprising convention: **`pnpm test` runs lint+format only**, not Vitest. Real tests live behind the `test:*` scripts below.

### Test suites (Vitest, four separate configs)

```sh
pnpm test:components          # Ink components (tests/components/)
pnpm test:core                # core/ unit tests (tests/core/)
pnpm test:commands            # command components (tests/source/commands/)
pnpm test:docs                # docs pipeline + cli/ + tools/ tests
```

Each has a `:coverage` variant (e.g. `pnpm test:core:coverage`) enforcing **80% lines/functions/statements/branches** (docs is 90/85). Configs:

| Suite      | Config file                   | Coverage target               |
| ---------- | ----------------------------- | ----------------------------- |
| components | `vitest.components.config.ts` | `source/components/**`        |
| core       | `vitest.core.config.ts`       | curated `source/core/**` set  |
| commands   | `vitest.commands.config.mjs`  | `source/commands/**`          |
| docs/cli   | `vitest.config.ts`            | docs tooling + `cli-metadata` |

Run a single test file: `pnpm vitest run --config vitest.core.config.ts tests/core/utils/url-parser.test.ts` (substitute the config matching where the test lives). Add `-t "<name>"` to filter by test name.

### Docs generation

```sh
pnpm docs:generate            # refresh docs/reference/ from source
pnpm docs:check               # fail if committed docs drift
```

Generated reference docs live under `docs/reference/` — **do not hand-edit**. Source of truth is `source/cli-metadata.ts` and TypeDoc.

### Aggregate gates

```sh
pnpm ci:local                 # local pre-push gate (no coverage flags)
pnpm verify:ci                # full CI parity (coverage on, used by release)
```

Git hooks (via `simple-git-hooks`):

- `commit-msg` → `tools/git-hooks/commit-msg-check.mjs` (Conventional Commits enforcement)
- `pre-commit` → `pnpm lint:staged`
- `pre-push` → `pnpm ci:local`

## Architecture

### Runtime flow

```
process.argv
  └─ source/cli.tsx
       ├─ buildCliHelpText() / cliFlags  ← source/cli-metadata.ts (single source of truth for help + flags + generated docs)
       ├─ meow() with normalizeCliArgv() ← reorders flags before positional args
       ├─ resolveCommand(cli)            ← positional dispatcher → ResolvedCommand
       └─ render(<App resolved={...} />) ← source/app.tsx switches on command name
                                            and mounts the matching Ink command component
```

`resolveCommand` in `source/cli.tsx` is the central router. It first matches subcommand families (`x`, `bili`, `weibo`, `hn`, `v2ex`, `reddit`, `xhs`, `summary`, then `zhihu <verb>`), then top-level Zhihu browse/download verbs, and finally falls back to `parseUrl()` auto-detection. New commands must be added in **four places**:

1. `CommandName` union in `source/commands/types.ts`
2. Routing branch in `source/cli.tsx` (`resolveCommand`)
3. `switch` case in `source/app.tsx` rendering the new command component
4. Help text entry in `source/cli-metadata.ts`

### Layered structure under `source/`

```
source/
├── cli.tsx                  # entrypoint + arg routing
├── cli-metadata.ts          # flags + help text (drives generated docs)
├── app.tsx                  # command → component dispatcher
├── commands/                # one Ink component per command family
│   ├── ui-{home,account-center,account-platform}.tsx   # interactive Ink screens
│   ├── {download,column,user,browse,login}.tsx         # Zhihu (download + top-level browse + login)
│   ├── zhihu-{account,interact,list,publish,delete}.tsx  # Zhihu account/interact/list/publish/delete
│   ├── x-{browse,interact,download,login}.tsx          # X (Twitter)
│   ├── xhs-{browse,interact,download,login,publish}.tsx
│   ├── bili-{browse,interact,download,login}.tsx
│   ├── weibo-{browse,interact,download,login,publish}.tsx
│   ├── hn-{browse,interact,download,login,publish}.tsx       # Hacker News
│   ├── v2ex-{browse,interact,download,login,publish}.tsx
│   ├── reddit-{browse,interact,download,login,publish}.tsx
│   ├── platform-download.tsx                           # CSDN/WeChat/Juejin
│   ├── summary.tsx                                     # AI summary
│   └── types.ts             # CommandName union, ResolvedCommand, GlobalFlags
├── components/              # reusable Ink UI (download-progress, qr-code, etc.)
└── core/                    # platform-agnostic logic, organized by domain
    ├── api/                 # HTTP clients per platform (zhihu, bili, x, xhs, weibo, hn, v2ex, reddit)
    ├── auth/                # cookie stores + login flows per platform
    ├── account/             # unified account-center probes/actions/snapshots
    ├── downloader/          # orchestration + per-platform downloaders (incl. platforms/)
    ├── parser/              # html-to-markdown rules + per-platform parsers
    ├── ai/                  # ai-config, content-extractor, summarizer
    ├── state/               # batch download resume tracker
    └── utils/               # url-parser, url-resolver, exit-codes, ink-app, headers, file-naming, config
```

### Two non-obvious conventions

**Exit codes follow sysexits.h.** `source/core/utils/exit-codes.ts` exports `ExitCode` (0/1/64/65/66/69/73/75/76/77) and a `CliError` class. Throw `CliError(message, ExitCode.X, hint)` for precise codes; otherwise `classifyErrorCode()` regex-matches messages (auth-needed → 77, network → 75, parse fail → 65). Ink components exit through `useInkApp()` (`source/core/utils/ink-app.ts`), which sets `process.exitCode` before calling `app.exit()`. **Don't call `process.exit()` from inside an Ink command** — it skips Ink teardown.

**Agent-facing JSON envelope.** `--format json` is contractually stable (see "Agent-Facing Runtime Contract" below). Newer commands wrap as `{ ok: true, data }` / `{ ok: false, error: { code, message, hint } }`; older commands still emit raw payloads (legacy). When adding a new command, emit the envelope. Errors use the same `code` numbers as `ExitCode`.

## Agent-Facing Runtime Contract

This section is the canonical contract between `zget` and AI agents that drive it programmatically. `AGENT.md` is a pointer to this section — keep them aligned.

### Quick start for agents

1. **Always pass `--format json`** to commands that support it — it returns a stable, parsable envelope.
2. **List capabilities** with `zget --help`. Per-platform help is namespaced: `zget xhs --help`, `zget bili --help`, `zget x --help`.
3. **Check auth state** with `zget ui-account-center --format json` before any write/interact command.
4. **Inspect a URL without downloading**: `zget search "<query>" --format json --limit 5` for Zhihu; analogous browse subcommands per platform.

### Auth model (per platform)

| Platform               | Login command                                 | Mechanism                                                               | Persisted at                                       |
| ---------------------- | --------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------- |
| Zhihu                  | `zget login` or `zget zhihu login [--cookie]` | QR code (60s window) or manual cookie import                            | `~/.zget-cli/cookies.json`                         |
| Bilibili               | `zget bili login`                             | QR code                                                                 | `~/.zget-cli/bili-cookies.json`                    |
| X (Twitter)            | `zget x login`                                | API credentials (env or interactive)                                    | `~/.zget-cli/x-credentials.json`                   |
| XHS                    | `zget xhs login`                              | Browser-driven cookie capture (Playwright)                              | `~/.zget-cli/xhs-cookies.json` + `xhs-tokens.json` |
| Weibo                  | `zget weibo login`                            | QR code or manual cookie                                                | `~/.zget-cli/weibo-cookies.json`                   |
| Hacker News            | `zget hn login`                               | Browser-driven cookie capture (Playwright) — HN has no API key          | `~/.zget-cli/hn-cookies.json`                      |
| V2EX                   | `zget v2ex login --cookie <token>`            | Personal Access Token (paste into `--cookie`)                           | `~/.zget-cli/v2ex-token.json`                      |
| Reddit                 | `zget reddit login --cookie '<json>'`         | OAuth2 script-app credentials (clientId / secret / username / password) | `~/.zget-cli/reddit-credentials.json`              |
| CSDN / WeChat / Juejin | none                                          | public scraping                                                         | —                                                  |

`--cookies "<raw>"` on any command overrides saved credentials per invocation. `--cookie` (singular) is reserved for the `login` subcommands that import a single platform's session/token.

### Output schema

All `--format json` outputs return one JSON document on stdout.

**Failure envelope (uniform across commands):**

```jsonc
{
	"ok": false,
	"error": {
		"code": 77, // sysexits.h numeric code
		"message": "未登录，请先运行 \"zget xhs login\"",
		"hint": "运行 zget xhs login"
	}
}
```

**Success envelope:** newer commands wrap as `{ ok: true, data: ... }` (e.g. `xhs post`). Older commands still emit the raw payload directly — they migrate to the envelope over time. Agents should:

1. First check whether the parsed root has `ok: false` → it is an error.
2. Otherwise check for `ok: true` + `data`; if absent, treat the entire document as the success payload (legacy shape).

Examples:

- `zget xhs post "标题" --image foo.jpg --format json` → `{ ok: true, data: { noteId } }`
- `zget xhs whoami --format json` → raw user object (legacy)
- `zget xhs like <noteId> --format json` → raw `{ success, action, target }` (legacy); failure uses the envelope above.
- `zget summary <url> --format json` → raw `{ provider, summary, sourceUrl }`

Commands that primarily produce filesystem artifacts (downloads) include `outputPath` and `imageCount` so an agent can locate the result without scraping `stdout`.

### Exit codes (sysexits.h subset)

| Code | Constant      | Meaning                                |
| ---- | ------------- | -------------------------------------- |
| 0    | `OK`          | Success                                |
| 1    | `GENERAL`     | Generic error (legacy fallback)        |
| 64   | `USAGE`       | Bad command-line usage                 |
| 65   | `DATA_ERR`    | URL or HTML failed to parse            |
| 66   | `NO_INPUT`    | Required argument missing              |
| 69   | `UNAVAILABLE` | Target service unreachable             |
| 73   | `CANTCREAT`   | Failed to write output                 |
| 75   | `TEMPFAIL`    | Transient network failure — retry safe |
| 76   | `PROTOCOL`    | Platform returned unexpected structure |
| 77   | `NOPERM`      | Auth required or permission denied     |

Agents SHOULD branch on these:

- `77` → call the platform's `login` subcommand.
- `75` → retry with backoff.
- `65` / `66` / `64` → user error; surface and stop.
- `69` / `76` → record incident; do not retry without backoff.

### Limits & known constraints

- **XHS** is driven by headless Chromium (Playwright). Each command spins up a browser; expect 5–15s overhead per call. Page structure is scraped from `__INITIAL_STATE__` and selectors may drift.
- **Hacker News** uses the same Playwright-driven cookie capture for write actions (HN has no public auth API). Read-only commands (`top`, `search`, `item`, `user`) talk to the Algolia + Firebase APIs directly and do not require a browser.
- **Zhihu QR login** has a ~60s window; a fresh `zget login` is required if the agent stalls.
- **X API tier** affects rate limits. The CLI does not retry; the agent should backoff on HTTP 429.
- **Weibo** image notes (`zget weibo post`) support ≤9 images per call; provide each path via repeated `--image`.
- **Image notes (XHS)** support 1–18 images per call; provide each path via repeated `--image`.
- **V2EX** PAT scopes determine which write commands work — if `v2ex thank-*` returns 403 the token is missing the necessary scope.
- **Reddit** OAuth2 password-grant does not issue refresh tokens — on expiry the CLI re-exchanges using the saved client_id/secret/username/password.

### Composability

Pipe-friendly examples:

```bash
zget xhs search "城市旅游" --format json --limit 20 \
  | jq -r '.data[].noteId' \
  | xargs -I{} zget xhs read {} --format json
```

For long-running batch downloads, `--resume` is on by default and progress is persisted under `~/.zget-cli/state/`.

### CLI help is the source of truth for docs

`source/cli-metadata.ts` is consumed by:

- runtime `--help` (via `buildCliHelpText()`)
- `tools/docs/generate-docs.ts` (writes `docs/reference/cli.md` + TypeDoc)
- `tools/docs/check-generated-docs.ts` (CI drift check)

Updating a flag in one place without the others will fail `pnpm docs:check`.

### Persistent state

All user data lives under `~/.zget-cli/`:

| File                               | Purpose                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `cookies.json`                     | Zhihu cookies                                                                 |
| `bili-cookies.json`                | Bilibili cookies                                                              |
| `xhs-cookies.json`                 | XHS cookies                                                                   |
| `xhs-tokens.json`                  | XHS auth tokens                                                               |
| `x-credentials.json`               | X (Twitter) API credentials                                                   |
| `weibo-cookies.json`               | Weibo cookies                                                                 |
| `hn-cookies.json`                  | Hacker News cookies (write actions only)                                      |
| `v2ex-token.json`                  | V2EX Personal Access Token                                                    |
| `reddit-credentials.json`          | Reddit OAuth2 script-app credentials                                          |
| `ai-config.json`                   | AI provider config                                                            |
| `downloads/` (state)               | Batch download resume state                                                   |
| `login_qrcode.png`                 | Last rendered QR code for QR-based logins                                     |
| `douban-cookies.json` _(reserved)_ | Reserved for in-development Douban support — not yet used by any CLI command  |
| `bsky-session.json` _(reserved)_   | Reserved for in-development Bluesky support — not yet used by any CLI command |

XHS and Hacker News auth/scraping are **Playwright-driven** (`source/core/api/xhs-browser.ts`, `source/core/api/hn-browser.ts`) — each call to a write-action subcommand boots headless Chromium (5–15s overhead). Selectors scrape page state and may drift when the upstream UI changes.

### XO/ESLint specifics

`xo` extends `xo-react`, semicolons on, prettier integration. Project-relative TS configs:

- `tsconfig.json` — runtime build (only `source/`)
- `tsconfig.tools.json` — tools/tests/vitest configs
- `tsconfig.xo.json` — lint-only TS context

Per-folder rule overrides live in `package.json` `xo.overrides`. `tools/**` and `tests/**` relax several `@typescript-eslint/no-unsafe-*` rules; `source/cli.tsx` disables `unicorn/no-process-exit`.

## Build

`pnpm build` calls `esbuild` directly (not tsup) — bundles `source/cli.tsx` to ESM, target `node20`, JSX automatic. Externalized at runtime: `ink`, `react`, `@inkjs/ui`, `qrcode`, `cheerio`, `turndown`, `sanitize-filename`, `undici`, `meow`, `playwright`, `dotenv`. When adding a new runtime dependency that ships native code or large artifacts, add it to the `--external:` list in `package.json` `scripts.build`.

## Release

Tag-driven (`v*.*.*`) via `.github/workflows/release.yml`:

1. `pnpm release:assert-version <tag>` checks tag matches `package.json` version
2. `pnpm release:verify` (= `pnpm verify:ci`)
3. `pnpm pack` artifact + `dist/` archive uploaded to GitHub Release
4. `pnpm publish` to npm using `NPM_TOKEN`

`prepublishOnly` runs `pnpm release:verify` so a manual `npm publish` cannot bypass gates.

## When extending

- **New flag**: add to `cliFlags` in `source/cli-metadata.ts` → wire in `cliParserFlags` in `source/cli.tsx` → propagate through `ResolvedCommand` if the command needs it → run `pnpm docs:generate`.
- **New command**: see "Architecture → Runtime flow" above (4 places).
- **New platform**: add `Platform` variant + regex in `source/core/utils/url-parser.ts`, declare the cookie/token file in `source/core/utils/config.ts`, then implement under `source/core/api/`, `source/core/auth/` (if auth needed), `source/core/parser/platforms/`, `source/core/downloader/platforms/`, hook into `source/core/account/platform-probes.ts` + `platform-actions.ts` so the account center sees it, then add the command components and routing branch. The Douban / Bluesky stubs in `url-parser.ts` and `account/` are the current template for this flow.
- **Generated docs**: never hand-edit `docs/reference/`. Run `pnpm docs:generate` and commit the diff.
