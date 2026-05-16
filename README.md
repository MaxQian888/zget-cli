# zget

A command-line tool that downloads articles, answers, videos, and social content from multiple Chinese and international platforms to Markdown files — plus authenticated browse / interact / publish for the platforms that support it, and an AI summary command.

## Supported Platforms

| Platform            | Domain(s)                                | Auth | Read | Interact | Publish |
| ------------------- | ---------------------------------------- | :--: | :--: | :------: | :-----: |
| 知乎 (Zhihu)        | `zhuanlan.zhihu.com`, `www.zhihu.com`    |  ✓   |  ✓   |    ✓     |    ✓    |
| X (Twitter)         | `x.com`, `twitter.com`                   |  ✓   |  ✓   |    ✓     |    ✓    |
| 小红书 (XHS)        | `xiaohongshu.com`, `xhslink.com`         |  ✓   |  ✓   |    ✓     |    ✓    |
| 哔哩哔哩 (Bilibili) | `bilibili.com`, `b23.tv`                 |  ✓   |  ✓   |    ✓     |    —    |
| 微博 (Weibo)        | `weibo.com`, `m.weibo.cn`, `s.weibo.com` |  ✓   |  ✓   |    ✓     |    ✓    |
| Hacker News         | `news.ycombinator.com`                   |  ✓   |  ✓   |    ✓     |    ✓    |
| V2EX                | `v2ex.com`                               |  ✓   |  ✓   |    ✓     |    ✓    |
| Reddit              | `reddit.com`, `redd.it`                  |  ✓   |  ✓   |    ✓     |    ✓    |
| CSDN                | `blog.csdn.net`                          |  —   |  ✓   |    —     |    —    |
| 微信公众号 (WeChat) | `mp.weixin.qq.com`                       |  —   |  ✓   |    —     |    —    |
| 掘金 (Juejin)       | `juejin.cn`                              |  —   |  ✓   |    —     |    —    |

## Requirements

- Node.js 20 or later
- For XHS / Hacker News write actions: a Chromium install for Playwright (`npx playwright install chromium`)

## Installation

```sh
npm install -g zget-cli
```

## Usage

### Interactive home

Run `zget` with no positional arguments to open the interactive Ink home screen:

```sh
zget
```

It opens the mixed navigation home where you can enter the account center, inspect every platform's login status, re-check the state, clear saved credentials, or jump to a login/setup command.

### Auto-detect from URL

Paste any supported URL and zget detects the platform automatically:

```sh
zget <url>
```

**Examples:**

```sh
zget https://zhuanlan.zhihu.com/p/123456789
zget https://blog.csdn.net/user/article/details/123456789
zget https://mp.weixin.qq.com/s/xxxxxxxx
zget https://juejin.cn/post/123456789
zget https://x.com/user/status/123456789
zget https://www.xiaohongshu.com/explore/abc123
zget https://www.bilibili.com/video/BV1xxxx
zget https://weibo.com/<uid>/<mid>
zget https://news.ycombinator.com/item?id=12345
zget https://v2ex.com/t/123456
zget https://www.reddit.com/r/programming/comments/abc123/title
```

### Agent mode

For programmatic use pass `--format json` to any command. The contract (envelope, exit codes, auth probing) is documented in [`CLAUDE.md` → Agent-Facing Runtime Contract](./CLAUDE.md#agent-facing-runtime-contract).

---

## Zhihu Commands

### Download

```sh
zget article <url>              # Download a Zhihu article
zget answer <url>               # Download a Zhihu answer
zget video <url>                # Download a Zhihu video
zget column <url>               # Download an entire column (batch)
zget user <url|username>        # Download all content from a user (batch)
```

### Browse

```sh
zget search <query>             # Search Zhihu (--type {general|topic|people})
zget hot                        # Show trending topics (热榜)
zget question <id>              # Show question details (--questions)
zget answers <question_id>      # List answers (--sort {default|voteups|created|updated})
zget feed                       # Show recommended feed
zget topic <id>                 # Show topic details (--questions)
zget user-info <username>       # Show a user's profile
zget user-answers <username>    # List a user's answers (--sort voteups)
zget user-articles <username>   # List a user's articles
zget answer <id> --comments     # Show answer body (with comments inline)
```

### Account

```sh
zget login                                # Top-level Zhihu QR login
zget zhihu login [--cookie "z_c0=…; _xsrf=…; d_c0=…"]   # Manual cookie import
zget zhihu logout                         # Clear saved cookies
zget zhihu status                         # Local-only auth status
zget zhihu whoami                         # Show current user (envelope JSON)
```

### Interact (requires login)

```sh
zget zhihu vote <answer_id> [--neutral]                                # Vote (cancel with --neutral)
zget zhihu follow {user|question|column} <id> [--unfollow]             # Follow / unfollow
zget zhihu comment <answer_id|article_id> -t "text" [--reply <cid>]    # Comment / reply
zget zhihu comments <answer_id|article_id>                             # List comments
zget zhihu uncomment <comment_id>                                      # Delete a comment
```

### Lists

```sh
zget zhihu followers <user_token>
zget zhihu following <user_token>
zget zhihu collections <user_token>
zget zhihu notifications [--limit] [--offset]
zget zhihu drafts
```

### Create / delete (requires login)

```sh
zget zhihu ask "<title>" [-d "detail"] [--topic <id>]... [--image <path>]...
zget zhihu pin "<title>" [--content "body"] [--image <path>]...
zget zhihu publish-article "<title>" "<content_html>" [--topic <id>]... [--image <path>]...
zget zhihu delete-question <id> [-y]
zget zhihu delete-pin <id> [-y]
zget zhihu delete-article <id> [-y]
```

---

## X (Twitter) Commands

```sh
zget x login                                # Check/setup X API credentials
zget x search <query>                       # Search recent tweets
zget x user <username>                      # Show user profile
zget x timeline <username>                  # Show user's tweets
zget x followers <username>                 # List user's followers
zget x following <username>                 # List user's following
zget x mentions                             # Show your mentions
zget x bookmarks                            # Show your bookmarks
zget x metrics <tweet_id|url>               # Show tweet engagement metrics
zget x tweet <url>                          # Download tweet as Markdown
zget x post "<text>"                        # Post a new tweet
zget x reply <id|url> -t "<text>"           # Reply to a tweet
zget x quote <id|url> -t "<text>"           # Quote a tweet
zget x delete <id|url>                      # Delete a tweet
zget x like <id|url>                        # Like a tweet
zget x retweet <id|url>                     # Retweet
```

---

## 小红书 (XHS) Commands

```sh
zget xhs login                              # Login via browser/cookie
zget xhs whoami                             # Show current user profile
zget xhs logout                             # Clear saved cookies
zget xhs search <query>                     # Search notes
zget xhs read <note_id>                     # Read note details
zget xhs feed                               # Show recommended content
zget xhs topics <query>                     # Search topics
zget xhs user <user_id>                     # Show user profile
zget xhs posts <user_id>                    # List user's notes
zget xhs followers <user_id>                # List user's followers
zget xhs following <user_id>                # List user's following
zget xhs favorites                          # Show your saved favorites
zget xhs like <note_id>                     # Like a note
zget xhs unlike <note_id>                   # Unlike a note
zget xhs favorite <note_id>                 # Save to favorites
zget xhs unfavorite <note_id>               # Remove from favorites
zget xhs comment <note_id> -t "<text>"      # Comment on a note
zget xhs delete <note_id>                   # Delete your note
zget xhs post "<title>" --image photo.jpg [--image ...] [--content "<body>"]
zget xhs <url>                              # Download note as Markdown
```

XHS write actions and login spin up headless Chromium (Playwright). Expect 5–15 s of overhead per call. Image notes take 1–18 images via repeated `--image`.

---

## 哔哩哔哩 (Bilibili) Commands

```sh
zget bili login                             # Login via QR code / cookie
zget bili whoami                            # Show current user
zget bili logout                            # Clear saved cookies
zget bili search <query>                    # Search videos
zget bili video <bvid|url>                  # Show video info + subtitles
zget bili user <mid>                        # Show user profile
zget bili videos <mid>                      # List user's videos
zget bili hot                               # Show popular videos
zget bili ranking                           # Show rankings
zget bili related <bvid>                    # Show related videos
zget bili comments <bvid>                   # Show video comments
zget bili like <bvid>                       # Like a video
zget bili coin <bvid>                       # Give coins
zget bili triple <bvid>                     # Triple-click (like + coin + favorite)
zget bili <url>                             # Download video content as Markdown
```

---

## 微博 (Weibo) Commands

```sh
zget weibo login                            # Login via QR code / cookie
zget weibo whoami                           # Show current user
zget weibo logout                           # Clear saved cookies
zget weibo hot                              # Show hot search topics
zget weibo search <query>                   # Search statuses
zget weibo feed [for-you|following]         # Show timeline
zget weibo read <id|mblogid>                # Show single status
zget weibo comments <id>                    # Show comments on a status
zget weibo user <uid|name>                  # Show user profile
zget weibo posts <uid>                      # Show user's recent posts
zget weibo favorites                        # Show your saved favorites
zget weibo followers <uid>                  # List user's followers
zget weibo following <uid>                  # List user's followings
zget weibo like <id>                        # Like a status
zget weibo unlike <id>                      # Unlike
zget weibo repost <id> [-t "<text>"]        # Repost
zget weibo comment <id> -t "<text>"         # Comment on a status
zget weibo delete <mid>                     # Delete your status
zget weibo follow <uid>                     # Follow user
zget weibo unfollow <uid>                   # Unfollow user
zget weibo post "<text>" [--image photo.jpg]   # Publish (≤9 images)
zget weibo <url>                            # Download status as Markdown
```

---

## Hacker News Commands

```sh
zget hn login                               # Login via browser cookie capture (Playwright)
zget hn whoami                              # Show current user
zget hn logout                              # Clear saved cookies
zget hn top | best | new | ask | show | jobs     # Front pages (--limit N)
zget hn search <query>                      # Algolia search (--limit N)
zget hn item <id>                           # Read a story / comment
zget hn user <name>                         # Show a user profile
zget hn user-submitted <name>               # Recent submissions by a user
zget hn comments <id>                       # Print a story's comment tree
zget hn upvote <id>                         # Upvote a story or comment
zget hn unvote <id>                         # Cancel an upvote
zget hn favorite <id>                       # Favorite an item
zget hn unfavorite <id>                     # Unfavorite
zget hn comment <id> -t "<text>"            # Reply to a story or comment
zget hn delete <id> --yes                   # Delete your story or comment
zget hn submit -t "<title>" --content <url|text>   # Submit a story
zget hn download <id|url>                   # Save item + comments as Markdown
```

Read commands hit Algolia / Firebase HTTP APIs directly. Write commands use Playwright to drive `news.ycombinator.com` since HN has no public auth API.

---

## V2EX Commands

```sh
zget v2ex login --cookie <token>            # Save Personal Access Token
zget v2ex whoami                            # Show current user
zget v2ex logout                            # Clear saved token
zget v2ex hot                               # Hot topics (--limit N)
zget v2ex latest                            # Latest topics (--limit N)
zget v2ex node <name>                       # Show a node's metadata
zget v2ex topics <name>                     # List a node's topics
zget v2ex topic <id>                        # Read a topic
zget v2ex replies <id>                      # List a topic's replies
zget v2ex member <name>                     # Show a member profile
zget v2ex notifications                     # Show your notifications
zget v2ex my-topics                         # Show your recent topics
zget v2ex my-following                      # Show topics you follow
zget v2ex collect <id>                      # Bookmark a topic
zget v2ex uncollect <id>                    # Remove from bookmarks
zget v2ex thank-topic <id>                  # Thank a topic
zget v2ex thank-reply <id>                  # Thank a reply
zget v2ex reply <id> -t "<text>"            # Reply to a topic
zget v2ex delete-reply <id> --yes           # Delete one of your replies
zget v2ex new-topic <node> -t "<title>" --content "<body>"   # Post a new topic
zget v2ex download <id|url>                 # Save topic + replies as Markdown
```

PAT scopes determine which write commands are allowed — if `thank-*` returns 403 the token is missing the necessary scope.

---

## Reddit Commands

```sh
zget reddit login --cookie '{"clientId":"...","clientSecret":"...","username":"...","password":"..."}'
zget reddit whoami                          # Show current user
zget reddit logout                          # Clear saved credentials
zget reddit hot [sub]                       # Front page hot (or r/<sub>)
zget reddit top [sub]                       # Top posts
zget reddit new [sub]                       # Newest posts
zget reddit search <query>                  # Search posts
zget reddit subreddit <name>                # Show subreddit metadata
zget reddit read <postId>                   # Read a post
zget reddit comments <postId>               # List a post's comment tree
zget reddit user <name>                     # Show a user profile
zget reddit user-posts <name>               # User's submissions
zget reddit user-comments <name>            # User's comments
zget reddit saved                           # Your saved items
zget reddit subscribed                      # Subreddits you're subscribed to
zget reddit upvote <id>                     # Upvote
zget reddit downvote <id>                   # Downvote
zget reddit unvote <id>                     # Cancel a vote
zget reddit save <id>                       # Save
zget reddit unsave <id>                     # Unsave
zget reddit subscribe <sub>                 # Subscribe to a subreddit
zget reddit unsubscribe <sub>               # Unsubscribe
zget reddit comment <id> -t "<text>"        # Reply to a post or comment
zget reddit delete <id> --yes               # Delete your post or comment
zget reddit submit <sub> -t "<title>" --content "<url-or-text>"   # Submit a post
zget reddit download <id|url>               # Save post + comments as Markdown
```

Reddit uses OAuth2 with a registered **script-type app**; password-grant tokens are short-lived and re-exchanged with the saved credentials on expiry. There are no refresh tokens.

---

## AI Summary

Summarize content from any supported URL:

```sh
zget summary <url>
```

zget reads AI credentials from `~/.zget-cli/ai-config.json` or from environment variables:

| Variable            | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `OPENAI_API_KEY`    | OpenAI API key                                             |
| `ANTHROPIC_API_KEY` | Anthropic (Claude) API key                                 |
| `DEEPSEEK_API_KEY`  | DeepSeek API key                                           |
| `AI_API_KEY`        | Generic fallback key                                       |
| `AI_PROVIDER`       | Force a provider: `openai`, `anthropic`, or `deepseek`     |
| `AI_MODEL`          | Override the default model                                 |
| `AI_BASE_URL`       | Override the API base URL (for OpenAI-compatible services) |

Supported providers and their default models:

| Provider  | Default model              |
| --------- | -------------------------- |
| OpenAI    | `gpt-4o-mini`              |
| Anthropic | `claude-sonnet-4-20250514` |
| DeepSeek  | `deepseek-chat`            |

---

## Options

| Flag          | Short | Default       | Description                                                                  |
| ------------- | ----- | ------------- | ---------------------------------------------------------------------------- |
| `--output`    | `-o`  | `./downloads` | Output directory                                                             |
| `--limit`     | `-l`  | `10`          | Max results for browse commands                                              |
| `--format`    | `-f`  | `human`       | Output format: `human` or `json`                                             |
| `--text`      | `-t`  |               | Text for post / reply / comment                                              |
| `--verbose`   | `-v`  | `false`       | Verbose output                                                               |
| `--resume`    |       | `true`        | Resume interrupted batch downloads                                           |
| `--no-images` |       |               | Skip downloading images                                                      |
| `--cookies`   |       |               | Cookie string (overrides saved cookies — applies to every supported command) |
| `--cookie`    |       |               | Single-platform cookie/token import for `<platform> login` subcommands       |
| `--image`     |       |               | Image path for XHS / Weibo / Zhihu publish (repeatable)                      |
| `--content`   |       |               | Body text for XHS / Zhihu / HN / V2EX / Reddit publish                       |
| `--detail`    | `-d`  |               | Question detail body for `zhihu ask` (HTML allowed)                          |
| `--topic`     |       |               | Topic ID for `zhihu ask` / `zhihu publish-article` (repeatable)              |
| `--neutral`   |       | `false`       | Cancel an existing vote (used with `zhihu vote`)                             |
| `--unfollow`  |       | `false`       | Unfollow instead of follow (used with `zhihu follow`)                        |
| `--reply`     |       |               | Reply to a comment ID (used with `zhihu comment`)                            |
| `--yes`       | `-y`  | `false`       | Skip confirmation for destructive actions                                    |
| `--type`      |       |               | Filter type for `search` (`general` / `topic` / `people`)                    |
| `--sort`      |       |               | Sort key for `user-answers` (`default` / `voteups` / `created` / `updated`)  |
| `--comments`  |       | `false`       | Include comments inline (used with `answer <id>`)                            |
| `--questions` |       | `false`       | Include top questions (used with `topic <id>`)                               |
| `--offset`    |       | `0`           | Offset for paginated browse commands                                         |

---

## Configuration Files

All persistent data lives under `~/.zget-cli/`:

| Path                      | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `cookies.json`            | Zhihu session cookies                    |
| `x-credentials.json`      | X (Twitter) API credentials              |
| `xhs-cookies.json`        | XHS session cookies                      |
| `xhs-tokens.json`         | XHS authentication tokens                |
| `bili-cookies.json`       | Bilibili session cookies                 |
| `weibo-cookies.json`      | Weibo session cookies                    |
| `hn-cookies.json`         | Hacker News cookies (write actions only) |
| `v2ex-token.json`         | V2EX Personal Access Token               |
| `reddit-credentials.json` | Reddit OAuth2 script-app credentials     |
| `ai-config.json`          | AI provider configuration                |
| `downloads/`              | Batch download resume state              |
| `login_qrcode.png`        | Last rendered QR for QR-based logins     |

---

## Development

```sh
pnpm install                 # install + simple-git-hooks setup
pnpm dev                     # Run from source with tsx
pnpm build                   # Bundle the CLI to dist/
pnpm build:check             # TypeScript type check only
pnpm lint                    # XO linter
pnpm format                  # Prettier
pnpm test                    # lint + format check (NOT a test runner)
pnpm test:components         # Ink component tests
pnpm test:core               # core/ unit tests
pnpm test:commands           # command-component tests
pnpm test:docs               # docs/cli-metadata tests
pnpm docs:generate           # Regenerate docs/reference/
pnpm docs:check              # Fail if generated docs drift
pnpm ci:local                # Local pre-push gate
pnpm verify:ci               # Full CI parity gate (used by release)
```

## Documentation

- Documentation hub: [docs/README.md](./docs/README.md)
- Project structure: [docs/project-structure.md](./docs/project-structure.md)
- Development workflow: [docs/development-workflow.md](./docs/development-workflow.md)
- CLI design: [docs/cli-design.md](./docs/cli-design.md)
- Quality gates: [docs/quality-gates.md](./docs/quality-gates.md)
- Troubleshooting: [docs/troubleshooting.md](./docs/troubleshooting.md)
- Generated reference: [docs/reference/README.md](./docs/reference/README.md)
- Release process: [docs/release-process.md](./docs/release-process.md)
- Agent integration: [`CLAUDE.md` → Agent-Facing Runtime Contract](./CLAUDE.md#agent-facing-runtime-contract) (`AGENT.md` is the pointer)

## License

MIT
