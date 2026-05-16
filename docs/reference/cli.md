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
    $ zget search <query> [--type {general|topic|people}]
    $ zget hot                         Show trending (热榜)
    $ zget question <id> [--questions]
    $ zget answers <question_id> [--sort {default|voteups|...}]
    $ zget feed                        Show recommended feed
    $ zget topic <id> [--questions]    Show topic details
    $ zget user-info <username>        Show user profile
    $ zget user-answers <username> [--sort voteups]
    $ zget user-articles <username>    Show user's articles
    $ zget answer <id> [--comments]    Show answer body (with comments)

  Zhihu Account
    $ zget zhihu login [--cookie "z_c0=…; _xsrf=…; d_c0=…"]
    $ zget zhihu logout                Clear saved cookies
    $ zget zhihu status                Local-only auth status
    $ zget zhihu whoami                Show current user (envelope JSON)

  Zhihu Interact (write operations — requires login)
    $ zget zhihu vote <answer_id> [--neutral]
    $ zget zhihu follow {user|question|column} <id> [--unfollow]
    $ zget zhihu comment <answer_id|article_id> -t "text" [--reply <comment_id>]
    $ zget zhihu comments <answer_id|article_id>
    $ zget zhihu uncomment <comment_id>

  Zhihu Lists
    $ zget zhihu followers <user_token>
    $ zget zhihu following <user_token>
    $ zget zhihu collections <user_token>
    $ zget zhihu notifications [--limit] [--offset]
    $ zget zhihu drafts

  Zhihu Create (write operations — requires login)
    $ zget zhihu ask "<title>" [-d "detail"] [--topic <id>]... [--image <path>]...
    $ zget zhihu pin "<title>" [-c "content"] [--image <path>]...
    $ zget zhihu publish-article "<title>" "<content_html>" [--topic <id>]... [--image <path>]...
    $ zget zhihu delete-question <id> [-y]
    $ zget zhihu delete-pin <id> [-y]
    $ zget zhihu delete-article <id> [-y]

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

  Weibo (微博) Commands
    $ zget weibo login                  Login via QR code/cookie
    $ zget weibo whoami                 Show current user
    $ zget weibo logout                 Clear saved cookies
    $ zget weibo hot                    Show hot search topics
    $ zget weibo search <query>         Search statuses
    $ zget weibo feed [for-you|following]  Show timeline
    $ zget weibo read <id|mblogid>      Show single status
    $ zget weibo comments <id>          Show comments on a status
    $ zget weibo user <uid|name>        Show user profile
    $ zget weibo posts <uid>            Show user's recent posts
    $ zget weibo favorites              Show your saved favorites
    $ zget weibo followers <uid>        Show user's followers
    $ zget weibo following <uid>        Show user's followings
    $ zget weibo like <id>              Like a status
    $ zget weibo unlike <id>            Unlike a status
    $ zget weibo repost <id> [-t "<text>"]  Repost a status
    $ zget weibo comment <id> -t "<text>"   Comment on a status
    $ zget weibo delete <mid>           Delete your status
    $ zget weibo follow <uid>           Follow user
    $ zget weibo unfollow <uid>         Unfollow user
    $ zget weibo post "<text>" [--image photo.jpg]   Publish a status (≤9 images)
    $ zget weibo <url>                  Download status as Markdown

  Hacker News Commands
    $ zget hn login                     Login via browser cookie capture
    $ zget hn whoami                    Show current user
    $ zget hn logout                    Clear saved cookies
    $ zget hn top|best|new|ask|show|jobs   Front pages (--limit N)
    $ zget hn search <query>            Algolia search (--limit N)
    $ zget hn item <id>                 Read a story / comment
    $ zget hn user <name>               Show a user profile
    $ zget hn user-submitted <name>     List a user's recent submissions
    $ zget hn comments <id>             Print a story's comment tree
    $ zget hn upvote <id>               Upvote a story or comment
    $ zget hn unvote <id>               Cancel an upvote
    $ zget hn favorite <id>             Favorite an item
    $ zget hn unfavorite <id>           Unfavorite an item
    $ zget hn comment <id> -t "<text>"  Reply to a story or comment
    $ zget hn delete <id> --yes         Delete your story or comment
    $ zget hn submit -t "<title>" --content <url|text>   Submit a story
    $ zget hn download <id|url>         Save item + comments as Markdown

  V2EX Commands
    $ zget v2ex login --cookie <token>  Save Personal Access Token
    $ zget v2ex whoami                  Show current user
    $ zget v2ex logout                  Clear saved token
    $ zget v2ex hot                     Show hot topics (--limit N)
    $ zget v2ex latest                  Show latest topics (--limit N)
    $ zget v2ex node <name>             Show a node's metadata
    $ zget v2ex topics <name>           List a node's topics
    $ zget v2ex topic <id>              Read a topic
    $ zget v2ex replies <id>            List a topic's replies
    $ zget v2ex member <name>           Show a member profile
    $ zget v2ex notifications           Show your notifications
    $ zget v2ex my-topics               Show your recent topics
    $ zget v2ex my-following            Show topics you're following
    $ zget v2ex collect <id>            Collect (bookmark) a topic
    $ zget v2ex uncollect <id>          Remove a topic from collection
    $ zget v2ex thank-topic <id>        Thank a topic
    $ zget v2ex thank-reply <id>        Thank a reply
    $ zget v2ex reply <id> -t "<text>"  Reply to a topic
    $ zget v2ex delete-reply <id> --yes Delete one of your replies
    $ zget v2ex new-topic <node> -t "<title>" --content "<body>"   Post a new topic
    $ zget v2ex download <id|url>       Save topic + replies as Markdown

  Reddit Commands
    $ zget reddit login --cookie '{"clientId":"...","clientSecret":"...","username":"...","password":"..."}'  Save OAuth2 script-app credentials
    $ zget reddit whoami                Show current user
    $ zget reddit logout                Clear saved credentials
    $ zget reddit hot [sub]             Front page hot (or r/<sub>)
    $ zget reddit top [sub]             Top posts (or r/<sub>)
    $ zget reddit new [sub]             Newest posts (or r/<sub>)
    $ zget reddit search <query>        Search posts
    $ zget reddit subreddit <name>      Show subreddit metadata
    $ zget reddit read <postId>         Read a post
    $ zget reddit comments <postId>     List a post's comment tree
    $ zget reddit user <name>           Show a user profile
    $ zget reddit user-posts <name>     List a user's submissions
    $ zget reddit user-comments <name>  List a user's comments
    $ zget reddit saved                 Your saved items
    $ zget reddit subscribed            Subreddits you're subscribed to
    $ zget reddit upvote <id>           Upvote a post or comment
    $ zget reddit downvote <id>         Downvote
    $ zget reddit unvote <id>           Cancel a vote
    $ zget reddit save <id>             Save a post or comment
    $ zget reddit unsave <id>           Unsave
    $ zget reddit subscribe <sub>       Subscribe to a subreddit
    $ zget reddit unsubscribe <sub>     Unsubscribe
    $ zget reddit comment <id> -t "<text>"  Reply to a post or comment
    $ zget reddit delete <id> --yes     Delete your post or comment
    $ zget reddit submit <sub> -t "<title>" --content "<url-or-text>"  Submit a post
    $ zget reddit download <id|url>     Save post + comments as Markdown

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
    --cookie        Cookie string for "zhihu login --cookie" (alias of --cookies, single platform)
    --detail, -d    Detail body for "zhihu ask" (HTML allowed)
    --topic         Topic ID for "zhihu ask"/"zhihu publish-article" (repeatable)
    --neutral       Cancel vote (used with "zhihu vote")
    --unfollow      Unfollow instead of follow (used with "zhihu follow")
    --reply         Reply to a comment ID (used with "zhihu comment")
    --yes, -y       Skip confirmation for destructive actions
    --type          Filter type: search {general|topic|people}
    --sort          Sort key: user-answers {default|voteups|created|updated}
    --comments      Include comments in answer view
    --questions     Include top questions in topic view
    --offset        Offset for paginated browse commands

  Supported Platforms
    - Zhihu (知乎):        zhuanlan.zhihu.com, www.zhihu.com
    - CSDN:               blog.csdn.net
    - WeChat (微信公众号):  mp.weixin.qq.com
    - Juejin (掘金):       juejin.cn
    - X (Twitter):        x.com, twitter.com
    - XHS (小红书):        xiaohongshu.com, xhslink.com
    - Bilibili (哔哩哔哩):  bilibili.com, b23.tv
    - Weibo (微博):        weibo.com, m.weibo.cn, s.weibo.com
    - Hacker News:        news.ycombinator.com
    - V2EX:               v2ex.com
    - Reddit:             reddit.com, redd.it
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
