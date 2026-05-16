# zget

一个命令行工具，用于将多个中文及国际平台的文章、回答、视频、社交内容下载为 Markdown 文件，并对支持的平台提供登录后的浏览 / 互动 / 发布能力，同时附带 AI 摘要命令。

[English Documentation](./README.md)

## 支持平台

| 平台        | 域名                                     | 登录 | 浏览 | 互动 | 发布 |
| ----------- | ---------------------------------------- | :--: | :--: | :--: | :--: |
| 知乎        | `zhuanlan.zhihu.com`、`www.zhihu.com`    |  ✓   |  ✓   |  ✓   |  ✓   |
| X (Twitter) | `x.com`、`twitter.com`                   |  ✓   |  ✓   |  ✓   |  ✓   |
| 小红书      | `xiaohongshu.com`、`xhslink.com`         |  ✓   |  ✓   |  ✓   |  ✓   |
| 哔哩哔哩    | `bilibili.com`、`b23.tv`                 |  ✓   |  ✓   |  ✓   |  —   |
| 微博        | `weibo.com`、`m.weibo.cn`、`s.weibo.com` |  ✓   |  ✓   |  ✓   |  ✓   |
| Hacker News | `news.ycombinator.com`                   |  ✓   |  ✓   |  ✓   |  ✓   |
| V2EX        | `v2ex.com`                               |  ✓   |  ✓   |  ✓   |  ✓   |
| Reddit      | `reddit.com`、`redd.it`                  |  ✓   |  ✓   |  ✓   |  ✓   |
| CSDN        | `blog.csdn.net`                          |  —   |  ✓   |  —   |  —   |
| 微信公众号  | `mp.weixin.qq.com`                       |  —   |  ✓   |  —   |  —   |
| 掘金        | `juejin.cn`                              |  —   |  ✓   |  —   |  —   |

## 前置要求

- Node.js 20 及以上版本
- 小红书 / Hacker News 写操作需要 Playwright 的 Chromium：`npx playwright install chromium`

## 安装

```bash
npm install -g zget-cli
```

## 使用方法

### 交互首页

直接运行 `zget`（不带位置参数）会进入交互式 Ink 首页：

```bash
zget
```

可以查看所有平台的登录状态、重新检查、清理本地凭据，或一键跳转到对应登录/配置命令。

### URL 自动识别

直接传入任意支持的 URL，zget 自动识别平台并执行对应操作：

```bash
zget <url>
```

**示例：**

```bash
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

### Agent 模式

程序化调用时统一加 `--format json`。完整 JSON 协议（信封、退出码、鉴权探测）见 [`CLAUDE.md` → Agent-Facing Runtime Contract](./CLAUDE.md#agent-facing-runtime-contract)。

---

## 知乎命令

### 下载

```bash
zget article <url>           # 下载单篇文章
zget answer <url>            # 下载单条回答
zget video <url>             # 下载视频
zget column <url>            # 批量下载专栏全部文章
zget user <url|username>     # 批量下载用户全部内容
```

### 浏览

```bash
zget search <query>          # 搜索（--type {general|topic|people}）
zget hot                     # 热榜
zget question <id>           # 问题详情（--questions）
zget answers <question_id>   # 回答列表（--sort {default|voteups|created|updated}）
zget feed                    # 推荐
zget topic <id>              # 话题详情（--questions）
zget user-info <username>    # 用户主页
zget user-answers <username> # 用户回答（--sort voteups）
zget user-articles <username># 用户文章
zget answer <id> --comments  # 查看回答正文+评论
```

### 账号

```bash
zget login                                            # 顶层扫码登录
zget zhihu login [--cookie "z_c0=…; _xsrf=…; d_c0=…"] # 手动导入 Cookie
zget zhihu logout                                     # 清除保存的 Cookie
zget zhihu status                                     # 本地登录状态
zget zhihu whoami                                     # 查询当前用户（envelope JSON）
```

### 互动（需登录）

```bash
zget zhihu vote <answer_id> [--neutral]                                  # 点赞 / 取消（--neutral）
zget zhihu follow {user|question|column} <id> [--unfollow]               # 关注 / 取消关注
zget zhihu comment <answer_id|article_id> -t "text" [--reply <cid>]      # 评论 / 回复评论
zget zhihu comments <answer_id|article_id>                               # 评论列表
zget zhihu uncomment <comment_id>                                        # 删评论
```

### 列表

```bash
zget zhihu followers <user_token>
zget zhihu following <user_token>
zget zhihu collections <user_token>
zget zhihu notifications [--limit] [--offset]
zget zhihu drafts
```

### 创建 / 删除（需登录）

```bash
zget zhihu ask "<title>" [-d "detail"] [--topic <id>]... [--image <path>]...
zget zhihu pin "<title>" [--content "正文"] [--image <path>]...
zget zhihu publish-article "<title>" "<content_html>" [--topic <id>]... [--image <path>]...
zget zhihu delete-question <id> [-y]
zget zhihu delete-pin <id> [-y]
zget zhihu delete-article <id> [-y]
```

---

## X (Twitter) 命令

```bash
zget x login                                # 配置 / 检查 X API 凭据
zget x search <query>                       # 搜索推文
zget x user <username>                      # 用户主页
zget x timeline <username>                  # 用户推文
zget x followers <username>                 # 粉丝
zget x following <username>                 # 关注
zget x mentions                             # 我的提及
zget x bookmarks                            # 我的书签
zget x metrics <id|url>                     # 推文互动数据
zget x tweet <url>                          # 下载推文为 Markdown
zget x post "<text>"                        # 发布推文
zget x reply <id|url> -t "<text>"           # 回复
zget x quote <id|url> -t "<text>"           # 引用
zget x delete <id|url>                      # 删除
zget x like <id|url>                        # 点赞
zget x retweet <id|url>                     # 转推
```

---

## 小红书命令

```bash
zget xhs login                              # 浏览器或 Cookie 登录
zget xhs whoami                             # 当前用户
zget xhs logout                             # 清除 Cookie
zget xhs search <query>                     # 搜索笔记
zget xhs read <note_id>                     # 笔记详情
zget xhs feed                               # 推荐
zget xhs topics <query>                     # 搜索话题
zget xhs user <user_id>                     # 用户主页
zget xhs posts <user_id>                    # 用户笔记
zget xhs followers <user_id>                # 粉丝
zget xhs following <user_id>                # 关注
zget xhs favorites                          # 我的收藏
zget xhs like <note_id>                     # 点赞
zget xhs unlike <note_id>                   # 取消点赞
zget xhs favorite <note_id>                 # 收藏
zget xhs unfavorite <note_id>               # 取消收藏
zget xhs comment <note_id> -t "<text>"      # 评论
zget xhs delete <note_id>                   # 删除自己的笔记
zget xhs post "<title>" --image photo.jpg [--image ...] [--content "<正文>"]
zget xhs <url>                              # 下载笔记为 Markdown
```

小红书登录和写操作走 Playwright 无头 Chromium，每次约有 5–15 秒开销。图文笔记最多支持 18 张图片，用 `--image` 多次传入。

---

## 哔哩哔哩命令

```bash
zget bili login                             # 扫码 / Cookie 登录
zget bili whoami                            # 当前用户
zget bili logout                            # 清除 Cookie
zget bili search <query>                    # 搜索视频
zget bili video <bvid|url>                  # 视频信息 + 字幕
zget bili user <mid>                        # 用户主页
zget bili videos <mid>                      # 用户视频列表
zget bili hot                               # 热门
zget bili ranking                           # 排行榜
zget bili related <bvid>                    # 相关视频
zget bili comments <bvid>                   # 视频评论
zget bili like <bvid>                       # 点赞
zget bili coin <bvid>                       # 投币
zget bili triple <bvid>                     # 三连
zget bili <url>                             # 下载视频内容为 Markdown
```

---

## 微博命令

```bash
zget weibo login                            # 扫码 / Cookie 登录
zget weibo whoami                           # 当前用户
zget weibo logout                           # 清除 Cookie
zget weibo hot                              # 热搜
zget weibo search <query>                   # 搜索微博
zget weibo feed [for-you|following]         # 时间线
zget weibo read <id|mblogid>                # 单条微博
zget weibo comments <id>                    # 微博评论
zget weibo user <uid|name>                  # 用户主页
zget weibo posts <uid>                      # 用户最近微博
zget weibo favorites                        # 我的收藏
zget weibo followers <uid>                  # 粉丝
zget weibo following <uid>                  # 关注
zget weibo like <id>                        # 点赞
zget weibo unlike <id>                      # 取消点赞
zget weibo repost <id> [-t "<text>"]        # 转发
zget weibo comment <id> -t "<text>"         # 评论
zget weibo delete <mid>                     # 删除自己的微博
zget weibo follow <uid>                     # 关注
zget weibo unfollow <uid>                   # 取消关注
zget weibo post "<text>" [--image photo.jpg]   # 发布（最多 9 张图片）
zget weibo <url>                            # 下载微博为 Markdown
```

---

## Hacker News 命令

```bash
zget hn login                               # 浏览器 Cookie 抓取（Playwright）
zget hn whoami                              # 当前用户
zget hn logout                              # 清除 Cookie
zget hn top | best | new | ask | show | jobs     # 各首页（--limit N）
zget hn search <query>                      # Algolia 搜索（--limit N）
zget hn item <id>                           # 查看 story / 评论
zget hn user <name>                         # 用户主页
zget hn user-submitted <name>               # 用户最近提交
zget hn comments <id>                       # story 的评论树
zget hn upvote <id>                         # 点赞 story / 评论
zget hn unvote <id>                         # 取消点赞
zget hn favorite <id>                       # 收藏
zget hn unfavorite <id>                     # 取消收藏
zget hn comment <id> -t "<text>"            # 回复
zget hn delete <id> --yes                   # 删除自己的内容
zget hn submit -t "<title>" --content <url|text>   # 提交新 story
zget hn download <id|url>                   # 保存 story + 评论为 Markdown
```

读操作直接调用 Algolia / Firebase HTTP API。写操作通过 Playwright 驱动 `news.ycombinator.com`（HN 没有公开鉴权 API）。

---

## V2EX 命令

```bash
zget v2ex login --cookie <token>            # 保存 Personal Access Token
zget v2ex whoami                            # 当前用户
zget v2ex logout                            # 清除 token
zget v2ex hot                               # 最热（--limit N）
zget v2ex latest                            # 最新（--limit N）
zget v2ex node <name>                       # 节点元数据
zget v2ex topics <name>                     # 节点下的主题
zget v2ex topic <id>                        # 查看主题
zget v2ex replies <id>                      # 主题回复
zget v2ex member <name>                     # 会员主页
zget v2ex notifications                     # 通知
zget v2ex my-topics                         # 我的主题
zget v2ex my-following                      # 关注的主题
zget v2ex collect <id>                      # 收藏主题
zget v2ex uncollect <id>                    # 取消收藏
zget v2ex thank-topic <id>                  # 感谢主题
zget v2ex thank-reply <id>                  # 感谢回复
zget v2ex reply <id> -t "<text>"            # 回复主题
zget v2ex delete-reply <id> --yes           # 删除自己的回复
zget v2ex new-topic <node> -t "<title>" --content "<body>"   # 发新主题
zget v2ex download <id|url>                 # 保存主题 + 回复为 Markdown
```

PAT 的 scope 决定可执行的写操作；若 `thank-*` 返回 403，多半是 token 缺少对应权限。

---

## Reddit 命令

```bash
zget reddit login --cookie '{"clientId":"...","clientSecret":"...","username":"...","password":"..."}'
zget reddit whoami                          # 当前用户
zget reddit logout                          # 清除凭据
zget reddit hot [sub]                       # 首页 hot（或 r/<sub>）
zget reddit top [sub]                       # top
zget reddit new [sub]                       # 最新
zget reddit search <query>                  # 搜索
zget reddit subreddit <name>                # 板块元数据
zget reddit read <postId>                   # 查看帖子
zget reddit comments <postId>               # 评论树
zget reddit user <name>                     # 用户主页
zget reddit user-posts <name>               # 用户帖子
zget reddit user-comments <name>            # 用户评论
zget reddit saved                           # 我的收藏
zget reddit subscribed                      # 我订阅的板块
zget reddit upvote <id>                     # upvote
zget reddit downvote <id>                   # downvote
zget reddit unvote <id>                     # 取消投票
zget reddit save <id>                       # 收藏
zget reddit unsave <id>                     # 取消收藏
zget reddit subscribe <sub>                 # 订阅板块
zget reddit unsubscribe <sub>               # 取消订阅
zget reddit comment <id> -t "<text>"        # 回复
zget reddit delete <id> --yes               # 删除自己的内容
zget reddit submit <sub> -t "<title>" --content "<url-or-text>"   # 发新帖
zget reddit download <id|url>               # 保存帖子 + 评论为 Markdown
```

Reddit 使用 **script-type** OAuth2 应用；password-grant 颁发的 token 较短期，过期时会用本地凭据自动重新换 token，不使用 refresh token。

---

## AI 摘要

对任意支持 URL 的内容生成 AI 摘要：

```bash
zget summary <url>
```

AI 配置从 `~/.zget-cli/ai-config.json` 或环境变量读取：

| 环境变量            | 用途                                            |
| ------------------- | ----------------------------------------------- |
| `OPENAI_API_KEY`    | OpenAI API 密钥                                 |
| `ANTHROPIC_API_KEY` | Anthropic (Claude) API 密钥                     |
| `DEEPSEEK_API_KEY`  | DeepSeek API 密钥                               |
| `AI_API_KEY`        | 通用回退密钥                                    |
| `AI_PROVIDER`       | 指定提供商：`openai`、`anthropic` 或 `deepseek` |
| `AI_MODEL`          | 覆盖默认模型                                    |
| `AI_BASE_URL`       | 覆盖 API 基础 URL（适用于 OpenAI 兼容服务）     |

各提供商默认模型：

| 提供商    | 默认模型                   |
| --------- | -------------------------- |
| OpenAI    | `gpt-4o-mini`              |
| Anthropic | `claude-sonnet-4-20250514` |
| DeepSeek  | `deepseek-chat`            |

---

## 全局选项

| 选项          | 简写 | 默认值        | 说明                                                                   |
| ------------- | ---- | ------------- | ---------------------------------------------------------------------- |
| `--output`    | `-o` | `./downloads` | 输出目录                                                               |
| `--limit`     | `-l` | `10`          | 浏览命令的最大结果数                                                   |
| `--format`    | `-f` | `human`       | 输出格式：`human` 或 `json`                                            |
| `--text`      | `-t` |               | 发帖 / 回复 / 评论的文本                                               |
| `--verbose`   | `-v` | `false`       | 详细输出                                                               |
| `--resume`    |      | `true`        | 恢复中断的批量下载                                                     |
| `--no-images` |      |               | 跳过下载图片                                                           |
| `--cookies`   |      |               | Cookie 字符串，覆盖所有平台已保存的凭据                                |
| `--cookie`    |      |               | 单平台 Cookie / Token 导入，仅用于 `<platform> login` 子命令           |
| `--image`     |      |               | 小红书 / 微博 / 知乎 发布的图片路径（可重复）                          |
| `--content`   |      |               | 小红书 / 知乎 / HN / V2EX / Reddit 发布的正文                          |
| `--detail`    | `-d` |               | `zhihu ask` 的问题描述正文（支持 HTML）                                |
| `--topic`     |      |               | `zhihu ask` / `zhihu publish-article` 的话题 ID（可重复）              |
| `--neutral`   |      | `false`       | 取消已有投票（`zhihu vote`）                                           |
| `--unfollow`  |      | `false`       | 强制取消关注（`zhihu follow`）                                         |
| `--reply`     |      |               | 回复指定评论 ID（`zhihu comment`）                                     |
| `--yes`       | `-y` | `false`       | 跳过破坏性操作的确认                                                   |
| `--type`      |      |               | `search` 的过滤类型（`general` / `topic` / `people`）                  |
| `--sort`      |      |               | `user-answers` 的排序（`default` / `voteups` / `created` / `updated`） |
| `--comments`  |      | `false`       | 同时打印评论（用于 `answer <id>`）                                     |
| `--questions` |      | `false`       | 同时打印热门问题（用于 `topic <id>`）                                  |
| `--offset`    |      | `0`           | 分页浏览命令的偏移                                                     |

---

## 配置文件

所有持久化数据存储在 `~/.zget-cli/` 目录下：

| 文件                      | 用途                           |
| ------------------------- | ------------------------------ |
| `cookies.json`            | 知乎会话 Cookie                |
| `x-credentials.json`      | X (Twitter) API 凭据           |
| `xhs-cookies.json`        | 小红书会话 Cookie              |
| `xhs-tokens.json`         | 小红书认证 Token               |
| `bili-cookies.json`       | 哔哩哔哩会话 Cookie            |
| `weibo-cookies.json`      | 微博会话 Cookie                |
| `hn-cookies.json`         | Hacker News Cookie（仅写操作） |
| `v2ex-token.json`         | V2EX Personal Access Token     |
| `reddit-credentials.json` | Reddit OAuth2 script-app 凭据  |
| `ai-config.json`          | AI 提供商配置                  |
| `downloads/`              | 批量下载恢复状态               |
| `login_qrcode.png`        | 最近一次扫码登录用的二维码图片 |

---

## 开发

```bash
pnpm install                 # 安装依赖 + simple-git-hooks
pnpm dev                     # 使用 tsx 从源码运行
pnpm build                   # 打包 CLI 到 dist/
pnpm build:check             # 仅做 TypeScript 类型检查
pnpm lint                    # XO lint
pnpm format                  # Prettier 格式化
pnpm test                    # lint + 格式检查（不是测试运行器）
pnpm test:components         # Ink 组件测试
pnpm test:core               # core/ 单元测试
pnpm test:commands           # 命令组件测试
pnpm test:docs               # 文档 / cli-metadata 测试
pnpm docs:generate           # 重新生成 docs/reference/
pnpm docs:check              # 检查生成文档是否有漂移
pnpm ci:local                # 本地 pre-push 门禁
pnpm verify:ci               # 与 CI 等价的完整门禁（发布前必跑）
```

## 文档导航

- 文档导航： [docs/README.md](./docs/README.md)
- 项目结构： [docs/project-structure.md](./docs/project-structure.md)
- 开发流程： [docs/development-workflow.md](./docs/development-workflow.md)
- CLI 设计： [docs/cli-design.md](./docs/cli-design.md)
- 质量门禁： [docs/quality-gates.md](./docs/quality-gates.md)
- 故障排查： [docs/troubleshooting.md](./docs/troubleshooting.md)
- 参考文档： [docs/reference/README.md](./docs/reference/README.md)
- 发布流程： [docs/release-process.md](./docs/release-process.md)
- Agent 集成： [`CLAUDE.md` → Agent-Facing Runtime Contract](./CLAUDE.md#agent-facing-runtime-contract)（`AGENT.md` 仅作为指针）

## 许可证

MIT
