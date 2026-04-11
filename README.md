# zget

A command-line tool that downloads articles, answers, videos, and social content from multiple Chinese and international platforms to Markdown files.

## Supported Platforms

| Platform            | Domain(s)                             |
| ------------------- | ------------------------------------- |
| 知乎 (Zhihu)        | `zhuanlan.zhihu.com`, `www.zhihu.com` |
| CSDN                | `blog.csdn.net`                       |
| 微信公众号 (WeChat) | `mp.weixin.qq.com`                    |
| 掘金 (Juejin)       | `juejin.cn`                           |
| X (Twitter)         | `x.com`, `twitter.com`                |
| 小红书 (XHS)        | `xiaohongshu.com`, `xhslink.com`      |
| 哔哩哔哩 (Bilibili) | `bilibili.com`, `b23.tv`              |

## Requirements

- Node.js 20 or later

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

The first release focuses on the account-center flow:

- open the mixed navigation home
- enter the account center
- inspect Zhihu / X / XHS / Bilibili / AI status
- re-check account state, clear saved credentials, or jump to the login/setup command

### Command mode

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
```

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
zget search <query>             # Search Zhihu
zget hot                        # Show trending topics (热榜)
zget question <id>              # Show question details
zget answers <question_id>      # List answers to a question
zget feed                       # Show recommended feed
zget topic <id>                 # Show topic details
zget user-info <username>       # Show a user's profile
zget user-answers <username>    # List a user's answers
zget user-articles <username>   # List a user's articles
```

### Auth

```sh
zget login                      # Log in to Zhihu via QR code
```

---

## X (Twitter) Commands

### Auth

```sh
zget x login                    # Configure X API credentials
```

### Browse

```sh
zget x search <query>           # Search recent tweets
zget x user <username>          # Show user profile
zget x timeline <username>      # Show user's tweets
zget x followers <username>     # List user's followers
zget x following <username>     # List user's following
zget x mentions                 # Show your mentions
zget x bookmarks                # Show your bookmarks
zget x metrics <tweet_id|url>   # Show tweet engagement metrics
```

### Download

```sh
zget x tweet <url>              # Download tweet as Markdown
```

### Interact

```sh
zget x post "<text>"                     # Post a new tweet
zget x reply <id|url> -t "<text>"        # Reply to a tweet
zget x quote <id|url> -t "<text>"        # Quote a tweet
zget x delete <id|url>                   # Delete a tweet
zget x like <id|url>                     # Like a tweet
zget x retweet <id|url>                  # Retweet
```

---

## 小红书 (XHS) Commands

### Auth

```sh
zget xhs login                  # Log in via browser or cookie
zget xhs whoami                 # Show current logged-in user
zget xhs logout                 # Clear saved cookies
```

### Browse

```sh
zget xhs search <query>         # Search notes
zget xhs read <note_id>         # Read a note's details
zget xhs feed                   # Show recommended content
zget xhs topics <query>         # Search topics
zget xhs user <user_id>         # Show a user's profile
zget xhs posts <user_id>        # List a user's notes
zget xhs followers <user_id>    # List a user's followers
zget xhs following <user_id>    # List a user's following
zget xhs favorites              # Show your saved favorites
```

### Download

```sh
zget xhs <url>                  # Download note as Markdown (auto-detect)
zget xhs download <note_id>     # Download note by ID
```

### Interact

```sh
zget xhs like <note_id>                     # Like a note
zget xhs unlike <note_id>                   # Unlike a note
zget xhs favorite <note_id>                 # Save a note to favorites
zget xhs unfavorite <note_id>               # Remove from favorites
zget xhs comment <note_id> -t "<text>"      # Comment on a note
zget xhs delete <note_id>                   # Delete your note
```

### Publish

```sh
zget xhs post "<title>" --image photo.jpg
```

Use `--image` multiple times to attach several images. Use `--content "<body>"` for the post body.

---

## 哔哩哔哩 (Bilibili) Commands

### Auth

```sh
zget bili login                 # Log in via QR code or cookie
zget bili whoami                # Show current logged-in user
zget bili logout                # Clear saved cookies
```

### Browse

```sh
zget bili search <query>        # Search videos
zget bili video <bvid|url>      # Show video info and subtitles
zget bili user <mid>            # Show a user's profile
zget bili videos <mid>          # List a user's videos
zget bili hot                   # Show popular videos
zget bili ranking               # Show rankings
zget bili related <bvid>        # Show related videos
zget bili comments <bvid>       # Show video comments
```

### Download

```sh
zget bili <url>                 # Download video content as Markdown (auto-detect)
zget bili download <bvid>       # Download by BV ID
```

### Interact

```sh
zget bili like <bvid>           # Like a video
zget bili coin <bvid>           # Give coins to a video
zget bili triple <bvid>         # Triple-click (like + coin + favorite)
```

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

| Flag          | Short | Default       | Description                             |
| ------------- | ----- | ------------- | --------------------------------------- |
| `--output`    | `-o`  | `./downloads` | Output directory                        |
| `--limit`     | `-l`  | `10`          | Max results for browse commands         |
| `--format`    | `-f`  | `human`       | Output format: `human` or `json`        |
| `--text`      | `-t`  |               | Text for post / reply / comment         |
| `--verbose`   | `-v`  | `false`       | Verbose output                          |
| `--resume`    |       | `true`        | Resume interrupted batch downloads      |
| `--no-images` |       |               | Skip downloading images                 |
| `--cookies`   |       |               | Cookie string (overrides saved cookies) |
| `--image`     |       |               | Image path for XHS publish (repeatable) |
| `--content`   |       |               | Body text for XHS publish               |

---

## Configuration Files

All persistent data lives under `~/.zget-cli/`:

| Path                 | Purpose                     |
| -------------------- | --------------------------- |
| `cookies.json`       | Zhihu session cookies       |
| `x-credentials.json` | X (Twitter) API credentials |
| `xhs-cookies.json`   | XHS session cookies         |
| `xhs-tokens.json`    | XHS authentication tokens   |
| `bili-cookies.json`  | Bilibili session cookies    |
| `ai-config.json`     | AI provider configuration   |
| `downloads/`         | Batch download resume state |

---

## Development

```sh
pnpm install
pnpm dev              # Run from source with tsx
pnpm build            # Bundle the CLI to dist/
pnpm build:check      # TypeScript type check only
pnpm lint             # XO linter
pnpm format           # Prettier
pnpm test             # lint + format check
```

## License

MIT
