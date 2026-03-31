# zget Command Workflows

Use this file when the task needs exact commands, auth prerequisites, or runtime config truth.

## Ground Truth Order

1. `source/cli-metadata.ts` for help text and global flags
2. `source/cli.tsx` for routing, required arguments, and URL auto-detection
3. `source/core/utils/config.ts` for local state paths
4. `source/core/auth/*.ts` and `source/core/ai/ai-config.ts` for auth/config behavior
5. `docs/reference/cli.md` and `README*.md` only after checking the files above

## Runtime Modes

- Current source: `pnpm dev -- <args>`
- Built output: `node dist/cli.js <args>`
- Quick help smoke: `pnpm dev -- --help`

## Global Flags

- `--output`, `-o`: output directory, default `./downloads`
- `--limit`, `-l`: result limit for browse commands
- `--format`, `-f`: `human` or `json`
- `--text`, `-t`: body for reply/comment/post actions
- `--verbose`, `-v`: verbose logs
- `--resume`: resume interrupted batch downloads
- `--no-images`: skip downloading images
- `--cookies`: override saved cookies
- `--image`: repeatable image path for XHS publish
- `--content`: content body for XHS publish

## URL Auto-Detection

Prefer direct URLs when the task is "download this content":

```bash
pnpm dev -- https://zhuanlan.zhihu.com/p/123456
pnpm dev -- https://www.zhihu.com/question/1/answer/2
pnpm dev -- https://x.com/user/status/123
pnpm dev -- https://www.xiaohongshu.com/explore/abc123
pnpm dev -- https://www.bilibili.com/video/BV1234567
pnpm dev -- https://blog.csdn.net/example/article/details/1
pnpm dev -- https://mp.weixin.qq.com/s/example
pnpm dev -- https://juejin.cn/post/123
```

If auto-detection is ambiguous or the task explicitly names the content type, use the explicit subcommand.

## Explicit Command Families

### Zhihu download and browse

```bash
pnpm dev -- article <url>
pnpm dev -- answer <url>
pnpm dev -- video <url>
pnpm dev -- column <url>
pnpm dev -- user <url-or-username>

pnpm dev -- search "<query>"
pnpm dev -- hot
pnpm dev -- question <id>
pnpm dev -- answers <question_id>
pnpm dev -- feed
pnpm dev -- topic <id>
pnpm dev -- user-info <username>
pnpm dev -- user-answers <username>
pnpm dev -- user-articles <username>
pnpm dev -- login
```

### X

```bash
pnpm dev -- x login
pnpm dev -- x search "<query>"
pnpm dev -- x user <username>
pnpm dev -- x timeline <username>
pnpm dev -- x followers <username>
pnpm dev -- x following <username>
pnpm dev -- x mentions
pnpm dev -- x bookmarks
pnpm dev -- x metrics <tweet_id-or-url>
pnpm dev -- x tweet <url>
pnpm dev -- x post "<text>"
pnpm dev -- x reply <id-or-url> -t "<text>"
pnpm dev -- x quote <id-or-url> -t "<text>"
pnpm dev -- x delete <id-or-url>
pnpm dev -- x like <id-or-url>
pnpm dev -- x retweet <id-or-url>
```

X runtime auth truth:

- `zget x login` expects credentials from env vars or saved config.
- Required env vars: `X_API_KEY`, `X_API_SECRET`, `X_BEARER_TOKEN`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`
- Saved credentials live at `~/.zget-cli/x-credentials.json`

### Xiaohongshu

```bash
pnpm dev -- xhs login
pnpm dev -- xhs whoami
pnpm dev -- xhs logout
pnpm dev -- xhs search "<query>"
pnpm dev -- xhs read <note_id>
pnpm dev -- xhs feed
pnpm dev -- xhs topics "<query>"
pnpm dev -- xhs user <user_id>
pnpm dev -- xhs posts <user_id>
pnpm dev -- xhs followers <user_id>
pnpm dev -- xhs following <user_id>
pnpm dev -- xhs favorites
pnpm dev -- xhs like <note_id>
pnpm dev -- xhs unlike <note_id>
pnpm dev -- xhs favorite <note_id>
pnpm dev -- xhs unfavorite <note_id>
pnpm dev -- xhs comment <note_id> -t "<text>"
pnpm dev -- xhs delete <note_id>
pnpm dev -- xhs post "<title>" --image photo.jpg --content "<body>"
pnpm dev -- xhs <url>
```

XHS runtime auth truth:

- Browser automation requires `npx playwright install chromium`
- Saved state lives at `~/.zget-cli/xhs-cookies.json` and `~/.zget-cli/xhs-tokens.json`
- `--cookies` can override saved session state for login

### Bilibili

```bash
pnpm dev -- bili login
pnpm dev -- bili whoami
pnpm dev -- bili logout
pnpm dev -- bili search "<query>"
pnpm dev -- bili video <bvid-or-url>
pnpm dev -- bili user <mid>
pnpm dev -- bili videos <mid>
pnpm dev -- bili hot
pnpm dev -- bili ranking
pnpm dev -- bili related <bvid>
pnpm dev -- bili comments <bvid>
pnpm dev -- bili like <bvid>
pnpm dev -- bili coin <bvid>
pnpm dev -- bili triple <bvid>
pnpm dev -- bili <url>
```

Bilibili runtime auth truth:

- Saved cookies live at `~/.zget-cli/bili-cookies.json`
- QR login can expire; rerun `zget bili login` if needed

## AI Summary

```bash
pnpm dev -- summary <url>
```

Runtime config truth is in `source/core/ai/ai-config.ts` and `source/commands/summary.tsx`:

- Saved config file: `~/.zget-cli/ai-config.json`
- Env vars actually read by runtime:
  - `AI_PROVIDER`
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `DEEPSEEK_API_KEY`
  - `AI_API_KEY`
  - `AI_MODEL`
  - `AI_BASE_URL`
  - `AI_LANGUAGE`

Docs currently mention `ZGET_AI_*` variables in several places. If a task depends on AI summary working right now, trust the runtime files above over the docs.

## Local State Paths

Runtime state lives under `~/.zget-cli`:

- `cookies.json`
- `downloads/`
- `login_qrcode.png`
- `x-credentials.json`
- `xhs-cookies.json`
- `xhs-tokens.json`
- `bili-cookies.json`
- `ai-config.json`

Some docs still mention `.zget-cookies.json`. Treat `source/core/utils/config.ts` as authoritative.

## Validation Commands

For command smoke tests:

```bash
pnpm dev -- --help
pnpm dev -- hot
```

For repo changes that affect CLI behavior:

```bash
pnpm test
pnpm test:docs
pnpm docs:generate
pnpm docs:check
pnpm build
node dist/cli.js --help
```
