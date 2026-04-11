# CLI Reference

## Primary Usage

```bash
$ zget <url>
```

## Runtime Help

```text
Usage
    $ zget                             Open the interactive home screen
    $ zget <url>                       Auto-detect platform and download

  Download Commands
    $ zget article <url>               Download Zhihu article
    $ zget answer <url>                Download Zhihu answer
    $ zget video <url>                 Download Zhihu video
    $ zget column <url>                Download Zhihu column (batch)
    $ zget user <url|username>         Download Zhihu user content (batch)
    $ zget csdn <url>                  Download CSDN article/category
    $ zget weixin <url>                Download WeChat article
    $ zget juejin <url>                Download Juejin article

  Browse Commands (Zhihu)
    $ zget search <query>              Search Zhihu
    $ zget hot                         Show trending (热榜)
    $ zget question <id>               Show question details
    $ zget answers <question_id>       Show answers to a question
    $ zget feed                        Show recommended feed
    $ zget topic <id>                  Show topic details
    $ zget user-info <username>        Show user profile
    $ zget user-answers <username>     Show user's answers
    $ zget user-articles <username>    Show user's articles

  X (Twitter) Commands
    $ zget x login                     Check/setup X API credentials
    $ zget x search <query>            Search recent tweets
    $ zget x user <username>           Show user profile
    $ zget x timeline <username>       Show user's tweets
    $ zget x followers <username>      Show user's followers
    $ zget x following <username>      Show user's following
    $ zget x mentions                  Show your mentions
    $ zget x bookmarks                 Show your bookmarks
    $ zget x metrics <tweet_id|url>    Show tweet engagement metrics
    $ zget x tweet <url>               Download tweet as Markdown
    $ zget x post "<text>"             Post a new tweet
    $ zget x reply <id|url> -t "<text>"  Reply to a tweet
    $ zget x quote <id|url> -t "<text>"  Quote a tweet
    $ zget x delete <id|url>           Delete a tweet
    $ zget x like <id|url>             Like a tweet
    $ zget x retweet <id|url>          Retweet

  XHS (小红书) Commands
    $ zget xhs login                   Login via browser/cookie
    $ zget xhs whoami                  Show current user profile
    $ zget xhs logout                  Clear saved cookies
    $ zget xhs search <query>          Search notes
    $ zget xhs read <note_id>          Read note details
    $ zget xhs feed                    Show recommended content
    $ zget xhs topics <query>          Search topics
    $ zget xhs user <user_id>          Show user profile
    $ zget xhs posts <user_id>         Show user's notes
    $ zget xhs followers <user_id>     Show user's followers
    $ zget xhs following <user_id>     Show user's following
    $ zget xhs favorites               Show your saved favorites
    $ zget xhs like <note_id>          Like a note
    $ zget xhs unlike <note_id>        Unlike a note
    $ zget xhs favorite <note_id>      Favorite a note
    $ zget xhs unfavorite <note_id>    Unfavorite a note
    $ zget xhs comment <note_id> -t "<text>"  Comment on a note
    $ zget xhs delete <note_id>        Delete your note
    $ zget xhs post "<title>" --image photo.jpg  Publish image note
    $ zget xhs <url>                   Download note as Markdown

  Bilibili (哔哩哔哩) Commands
    $ zget bili login                   Login via QR code/cookie
    $ zget bili whoami                  Show current user
    $ zget bili logout                  Clear saved cookies
    $ zget bili search <query>          Search videos
    $ zget bili video <bvid|url>        Show video info + subtitles
    $ zget bili user <mid>              Show user profile
    $ zget bili videos <mid>            Show user's videos
    $ zget bili hot                     Show popular videos
    $ zget bili ranking                 Show rankings
    $ zget bili related <bvid>          Show related videos
    $ zget bili comments <bvid>         Show video comments
    $ zget bili like <bvid>             Like a video
    $ zget bili coin <bvid>             Give coins
    $ zget bili triple <bvid>           Triple-click (like+coin+fav)
    $ zget bili <url>                   Download video content as Markdown

  AI Summary
    $ zget summary <url>                Summarize content from any URL

  Auth
    $ zget login                       Login to Zhihu via QR code

  Options
    --output, -o    Output directory (default: ./downloads)
    --limit, -l     Limit results for browse commands (default: 10)
    --format, -f    Output format: human or json (default: human)
    --text, -t      Text content for post/reply/comment
    --verbose, -v   Verbose output
    --resume        Resume interrupted batch downloads (default: true)
    --no-images     Skip downloading images
    --cookies       Cookie string (overrides saved cookies)
    --image         Image path for XHS publish (can repeat)
    --content       Content body for XHS publish

  Supported Platforms
    - Zhihu (知乎):        zhuanlan.zhihu.com, www.zhihu.com
    - CSDN:               blog.csdn.net
    - WeChat (微信公众号):  mp.weixin.qq.com
    - Juejin (掘金):       juejin.cn
    - X (Twitter):        x.com, twitter.com
    - XHS (小红书):        xiaohongshu.com, xhslink.com
    - Bilibili (哔哩哔哩):  bilibili.com, b23.tv
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--output, -o` | `string` | `./downloads` | Output directory |
| `--limit, -l` | `number` | `10` | Limit results for browse commands |
| `--format, -f` | `string` | `human` | Output format: human or json |
| `--text, -t` | `string` | `(empty)` | Text content for post/reply/comment |
| `--verbose, -v` | `boolean` | `false` | Verbose output |
| `--resume` | `boolean` | `true` | Resume interrupted batch downloads |
| `--images / --no-images` | `boolean` | `true` | Download images locally (use --no-images to skip downloads) |
| `--cookies` | `string` | `(empty)` | Cookie string (overrides saved cookies) |
| `--image` | `string[]` | `(empty)` | Image path for XHS publish (can repeat) |
| `--content` | `string` | `(empty)` | Content body for XHS publish |
