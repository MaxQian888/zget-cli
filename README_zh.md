# zget

一个命令行工具，用于将多个中文及国际平台的文章、回答、视频和社交内容下载为 Markdown 文件。

[English Documentation](./README.md)

## 支持平台

| 平台        | 域名                                  |
| ----------- | ------------------------------------- |
| 知乎        | `zhuanlan.zhihu.com`、`www.zhihu.com` |
| CSDN        | `blog.csdn.net`                       |
| 微信公众号  | `mp.weixin.qq.com`                    |
| 掘金        | `juejin.cn`                           |
| X (Twitter) | `x.com`、`twitter.com`                |
| 小红书      | `xiaohongshu.com`、`xhslink.com`      |
| 哔哩哔哩    | `bilibili.com`、`b23.tv`              |

## 前置要求

- Node.js 20 及以上版本

## 安装

```bash
npm install -g zget-cli
```

## 使用方法

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
```

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
zget search <query>          # 搜索知乎
zget hot                     # 热榜
zget question <id>           # 查看问题详情
zget answers <question_id>   # 查看问题下的回答列表
zget feed                    # 推荐内容
zget topic <id>              # 话题详情
zget user-info <username>    # 用户主页
zget user-answers <username> # 用户的回答列表
zget user-articles <username># 用户的文章列表
```

### 登录

```bash
zget login                   # 扫码登录知乎
```

---

## X (Twitter) 命令

### 认证

```bash
zget x login                 # 配置 X API 凭据
```

### 浏览

```bash
zget x search <query>        # 搜索推文
zget x user <username>       # 用户主页
zget x timeline <username>   # 用户推文列表
zget x followers <username>  # 用户的粉丝列表
zget x following <username>  # 用户的关注列表
zget x mentions              # 我的提及
zget x bookmarks             # 我的书签
zget x metrics <id|url>      # 推文互动数据
```

### 下载

```bash
zget x tweet <url>           # 下载推文为 Markdown
```

### 互动

```bash
zget x post "<text>"                  # 发布推文
zget x reply <id|url> -t "<text>"     # 回复推文
zget x quote <id|url> -t "<text>"     # 引用推文
zget x delete <id|url>                # 删除推文
zget x like <id|url>                  # 点赞
zget x retweet <id|url>               # 转推
```

---

## 小红书命令

### 认证

```bash
zget xhs login               # 浏览器或 Cookie 登录
zget xhs whoami              # 查看当前登录用户
zget xhs logout              # 清除保存的 Cookie
```

### 浏览

```bash
zget xhs search <query>      # 搜索笔记
zget xhs read <note_id>      # 查看笔记详情
zget xhs feed                # 推荐内容
zget xhs topics <query>      # 搜索话题
zget xhs user <user_id>      # 用户主页
zget xhs posts <user_id>     # 用户的笔记列表
zget xhs followers <user_id> # 用户的粉丝列表
zget xhs following <user_id> # 用户的关注列表
zget xhs favorites           # 我的收藏
```

### 下载

```bash
zget xhs <url>               # 下载笔记为 Markdown（自动识别）
zget xhs download <note_id>  # 按 ID 下载笔记
```

### 互动

```bash
zget xhs like <note_id>                    # 点赞
zget xhs unlike <note_id>                  # 取消点赞
zget xhs favorite <note_id>                # 收藏
zget xhs unfavorite <note_id>              # 取消收藏
zget xhs comment <note_id> -t "<text>"     # 评论
zget xhs delete <note_id>                  # 删除笔记
```

### 发布

```bash
zget xhs post "<title>" --image photo.jpg
```

用 `--image` 可附加多张图片，用 `--content "<body>"` 填写正文。

---

## 哔哩哔哩命令

### 认证

```bash
zget bili login              # 扫码或 Cookie 登录
zget bili whoami             # 查看当前登录用户
zget bili logout             # 清除保存的 Cookie
```

### 浏览

```bash
zget bili search <query>     # 搜索视频
zget bili video <bvid|url>   # 视频信息及字幕
zget bili user <mid>         # 用户主页
zget bili videos <mid>       # 用户的视频列表
zget bili hot                # 热门视频
zget bili ranking            # 排行榜
zget bili related <bvid>     # 相关视频
zget bili comments <bvid>    # 视频评论
```

### 下载

```bash
zget bili <url>              # 下载视频内容为 Markdown（自动识别）
zget bili download <bvid>    # 按 BV 号下载
```

### 互动

```bash
zget bili like <bvid>        # 点赞
zget bili coin <bvid>        # 投币
zget bili triple <bvid>      # 三连（点赞+投币+收藏）
```

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

| 选项          | 简写 | 默认值        | 说明                                 |
| ------------- | ---- | ------------- | ------------------------------------ |
| `--output`    | `-o` | `./downloads` | 下载文件的输出目录                   |
| `--limit`     | `-l` | `10`          | 浏览命令的最大结果数                 |
| `--format`    | `-f` | `human`       | 输出格式：`human` 或 `json`          |
| `--text`      | `-t` |               | 发帖 / 回复 / 评论的文本内容         |
| `--verbose`   | `-v` | `false`       | 详细输出                             |
| `--resume`    |      | `true`        | 恢复中断的批量下载                   |
| `--no-images` |      |               | 跳过下载图片                         |
| `--cookies`   |      |               | Cookie 字符串（覆盖已保存的 Cookie） |
| `--image`     |      |               | 小红书发布的图片路径（可重复）       |
| `--content`   |      |               | 小红书发布的正文内容                 |

---

## 配置文件

所有持久化数据存储在 `~/.zget-cli/` 目录下：

| 文件                 | 用途                 |
| -------------------- | -------------------- |
| `cookies.json`       | 知乎会话 Cookie      |
| `x-credentials.json` | X (Twitter) API 凭据 |
| `xhs-cookies.json`   | 小红书会话 Cookie    |
| `xhs-tokens.json`    | 小红书认证 Token     |
| `bili-cookies.json`  | 哔哩哔哩会话 Cookie  |
| `ai-config.json`     | AI 提供商配置        |
| `downloads/`         | 批量下载恢复状态     |

---

## 开发

```bash
pnpm install
pnpm dev              # 使用 tsx 从源码运行
pnpm build            # 编译到 dist/
pnpm build:check      # 仅做 TypeScript 类型检查
pnpm lint             # XO lint
pnpm format           # Prettier 格式化
pnpm test             # lint + 格式检查
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

## 许可证

MIT
