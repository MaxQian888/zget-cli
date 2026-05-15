export const cliName = 'zget';

export const cliFlags = {
	output: {
		type: 'string' as const,
		shortFlag: 'o',
		description: 'Output directory',
		default: './downloads',
	},
	verbose: {
		type: 'boolean' as const,
		shortFlag: 'v',
		description: 'Verbose output',
		default: false,
	},
	resume: {
		type: 'boolean' as const,
		description: 'Resume interrupted batch downloads',
		default: true,
	},
	images: {
		type: 'boolean' as const,
		description: 'Download images locally',
		default: true,
	},
	cookies: {
		type: 'string' as const,
		description: 'Cookie string (overrides saved cookies)',
		default: '',
	},
	limit: {
		type: 'number' as const,
		shortFlag: 'l',
		description: 'Limit results for browse commands',
		default: 10,
	},
	format: {
		type: 'string' as const,
		shortFlag: 'f',
		description: 'Output format: human or json',
		default: 'human',
	},
	text: {
		type: 'string' as const,
		shortFlag: 't',
		description: 'Text content for post/reply/comment',
		default: '',
	},
	image: {
		type: 'string' as const,
		description: 'Image path for XHS publish (can repeat)',
		default: '',
		isMultiple: true,
	},
	content: {
		type: 'string' as const,
		description: 'Content body for XHS publish',
		default: '',
	},
	cookie: {
		type: 'string' as const,
		description:
			'Cookie string for "zhihu login --cookie" (alias of --cookies, single platform)',
		default: '',
	},
	detail: {
		type: 'string' as const,
		shortFlag: 'd',
		description: 'Detail body for "zhihu ask" (HTML allowed)',
		default: '',
	},
	topic: {
		type: 'string' as const,
		description:
			'Topic ID for "zhihu ask"/"zhihu publish-article" (repeatable)',
		default: '',
		isMultiple: true,
	},
	neutral: {
		type: 'boolean' as const,
		description: 'Cancel vote (used with "zhihu vote")',
		default: false,
	},
	unfollow: {
		type: 'boolean' as const,
		description: 'Unfollow instead of follow (used with "zhihu follow")',
		default: false,
	},
	reply: {
		type: 'string' as const,
		description: 'Reply to a comment ID (used with "zhihu comment")',
		default: '',
	},
	yes: {
		type: 'boolean' as const,
		shortFlag: 'y',
		description: 'Skip confirmation for destructive actions',
		default: false,
	},
	type: {
		type: 'string' as const,
		description: 'Filter type: search {general|topic|people}',
		default: '',
	},
	sort: {
		type: 'string' as const,
		description: 'Sort key: user-answers {default|voteups|created|updated}',
		default: '',
	},
	comments: {
		type: 'boolean' as const,
		description: 'Include comments in answer view',
		default: false,
	},
	questions: {
		type: 'boolean' as const,
		description: 'Include top questions in topic view',
		default: false,
	},
	offset: {
		type: 'number' as const,
		description: 'Offset for paginated browse commands',
		default: 0,
	},
};

export function buildCliHelpText(): string {
	return `
  Usage
    $ ${cliName}                             Open the interactive home screen
    $ ${cliName} <url>                       Auto-detect platform and download

  Download Commands
    $ ${cliName} article <url>               Download Zhihu article
    $ ${cliName} answer <url>                Download Zhihu answer
    $ ${cliName} video <url>                 Download Zhihu video
    $ ${cliName} column <url>                Download Zhihu column (batch)
    $ ${cliName} user <url|username>         Download Zhihu user content (batch)
    $ ${cliName} csdn <url>                  Download CSDN article/category
    $ ${cliName} weixin <url>                Download WeChat article
    $ ${cliName} juejin <url>                Download Juejin article

  Browse Commands (Zhihu)
    $ ${cliName} search <query> [--type {general|topic|people}]
    $ ${cliName} hot                         Show trending (热榜)
    $ ${cliName} question <id> [--questions]
    $ ${cliName} answers <question_id> [--sort {default|voteups|...}]
    $ ${cliName} feed                        Show recommended feed
    $ ${cliName} topic <id> [--questions]    Show topic details
    $ ${cliName} user-info <username>        Show user profile
    $ ${cliName} user-answers <username> [--sort voteups]
    $ ${cliName} user-articles <username>    Show user's articles
    $ ${cliName} answer <id> [--comments]    Show answer body (with comments)

  Zhihu Account
    $ ${cliName} zhihu login [--cookie "z_c0=…; _xsrf=…; d_c0=…"]
    $ ${cliName} zhihu logout                Clear saved cookies
    $ ${cliName} zhihu status                Local-only auth status
    $ ${cliName} zhihu whoami                Show current user (envelope JSON)

  Zhihu Interact (write operations — requires login)
    $ ${cliName} zhihu vote <answer_id> [--neutral]
    $ ${cliName} zhihu follow {user|question|column} <id> [--unfollow]
    $ ${cliName} zhihu comment <answer_id|article_id> -t "text" [--reply <comment_id>]
    $ ${cliName} zhihu comments <answer_id|article_id>
    $ ${cliName} zhihu uncomment <comment_id>

  Zhihu Lists
    $ ${cliName} zhihu followers <user_token>
    $ ${cliName} zhihu following <user_token>
    $ ${cliName} zhihu collections <user_token>
    $ ${cliName} zhihu notifications [--limit] [--offset]
    $ ${cliName} zhihu drafts

  Zhihu Create (write operations — requires login)
    $ ${cliName} zhihu ask "<title>" [-d "detail"] [--topic <id>]... [--image <path>]...
    $ ${cliName} zhihu pin "<title>" [-c "content"] [--image <path>]...
    $ ${cliName} zhihu publish-article "<title>" "<content_html>" [--topic <id>]... [--image <path>]...
    $ ${cliName} zhihu delete-question <id> [-y]
    $ ${cliName} zhihu delete-pin <id> [-y]
    $ ${cliName} zhihu delete-article <id> [-y]

  X (Twitter) Commands
    $ ${cliName} x login                     Check/setup X API credentials
    $ ${cliName} x search <query>            Search recent tweets
    $ ${cliName} x user <username>           Show user profile
    $ ${cliName} x timeline <username>       Show user's tweets
    $ ${cliName} x followers <username>      Show user's followers
    $ ${cliName} x following <username>      Show user's following
    $ ${cliName} x mentions                  Show your mentions
    $ ${cliName} x bookmarks                 Show your bookmarks
    $ ${cliName} x metrics <tweet_id|url>    Show tweet engagement metrics
    $ ${cliName} x tweet <url>               Download tweet as Markdown
    $ ${cliName} x post "<text>"             Post a new tweet
    $ ${cliName} x reply <id|url> -t "<text>"  Reply to a tweet
    $ ${cliName} x quote <id|url> -t "<text>"  Quote a tweet
    $ ${cliName} x delete <id|url>           Delete a tweet
    $ ${cliName} x like <id|url>             Like a tweet
    $ ${cliName} x retweet <id|url>          Retweet

  XHS (小红书) Commands
    $ ${cliName} xhs login                   Login via browser/cookie
    $ ${cliName} xhs whoami                  Show current user profile
    $ ${cliName} xhs logout                  Clear saved cookies
    $ ${cliName} xhs search <query>          Search notes
    $ ${cliName} xhs read <note_id>          Read note details
    $ ${cliName} xhs feed                    Show recommended content
    $ ${cliName} xhs topics <query>          Search topics
    $ ${cliName} xhs user <user_id>          Show user profile
    $ ${cliName} xhs posts <user_id>         Show user's notes
    $ ${cliName} xhs followers <user_id>     Show user's followers
    $ ${cliName} xhs following <user_id>     Show user's following
    $ ${cliName} xhs favorites               Show your saved favorites
    $ ${cliName} xhs like <note_id>          Like a note
    $ ${cliName} xhs unlike <note_id>        Unlike a note
    $ ${cliName} xhs favorite <note_id>      Favorite a note
    $ ${cliName} xhs unfavorite <note_id>    Unfavorite a note
    $ ${cliName} xhs comment <note_id> -t "<text>"  Comment on a note
    $ ${cliName} xhs delete <note_id>        Delete your note
    $ ${cliName} xhs post "<title>" --image photo.jpg  Publish image note
    $ ${cliName} xhs <url>                   Download note as Markdown

  Bilibili (哔哩哔哩) Commands
    $ ${cliName} bili login                   Login via QR code/cookie
    $ ${cliName} bili whoami                  Show current user
    $ ${cliName} bili logout                  Clear saved cookies
    $ ${cliName} bili search <query>          Search videos
    $ ${cliName} bili video <bvid|url>        Show video info + subtitles
    $ ${cliName} bili user <mid>              Show user profile
    $ ${cliName} bili videos <mid>            Show user's videos
    $ ${cliName} bili hot                     Show popular videos
    $ ${cliName} bili ranking                 Show rankings
    $ ${cliName} bili related <bvid>          Show related videos
    $ ${cliName} bili comments <bvid>         Show video comments
    $ ${cliName} bili like <bvid>             Like a video
    $ ${cliName} bili coin <bvid>             Give coins
    $ ${cliName} bili triple <bvid>           Triple-click (like+coin+fav)
    $ ${cliName} bili <url>                   Download video content as Markdown

  Weibo (微博) Commands
    $ ${cliName} weibo login                  Login via QR code/cookie
    $ ${cliName} weibo whoami                 Show current user
    $ ${cliName} weibo logout                 Clear saved cookies
    $ ${cliName} weibo hot                    Show hot search topics
    $ ${cliName} weibo search <query>         Search statuses
    $ ${cliName} weibo feed [for-you|following]  Show timeline
    $ ${cliName} weibo read <id|mblogid>      Show single status
    $ ${cliName} weibo comments <id>          Show comments on a status
    $ ${cliName} weibo user <uid|name>        Show user profile
    $ ${cliName} weibo posts <uid>            Show user's recent posts
    $ ${cliName} weibo favorites              Show your saved favorites
    $ ${cliName} weibo followers <uid>        Show user's followers
    $ ${cliName} weibo following <uid>        Show user's followings
    $ ${cliName} weibo like <id>              Like a status
    $ ${cliName} weibo unlike <id>            Unlike a status
    $ ${cliName} weibo repost <id> [-t "<text>"]  Repost a status
    $ ${cliName} weibo comment <id> -t "<text>"   Comment on a status
    $ ${cliName} weibo delete <mid>           Delete your status
    $ ${cliName} weibo follow <uid>           Follow user
    $ ${cliName} weibo unfollow <uid>         Unfollow user
    $ ${cliName} weibo post "<text>" [--image photo.jpg]   Publish a status (≤9 images)
    $ ${cliName} weibo <url>                  Download status as Markdown

  AI Summary
    $ ${cliName} summary <url>                Summarize content from any URL

  Auth
    $ ${cliName} login                       Login to Zhihu via QR code

  Options
    --output, -o    ${cliFlags.output.description} (default: ${cliFlags.output.default})
    --limit, -l     ${cliFlags.limit.description} (default: ${cliFlags.limit.default})
    --format, -f    ${cliFlags.format.description} (default: ${cliFlags.format.default})
    --text, -t      ${cliFlags.text.description}
    --verbose, -v   ${cliFlags.verbose.description}
    --resume        ${cliFlags.resume.description} (default: true)
    --no-images     Skip downloading images
    --cookies       ${cliFlags.cookies.description}
    --image         ${cliFlags.image.description}
    --content       ${cliFlags.content.description}
    --cookie        ${cliFlags.cookie.description}
    --detail, -d    ${cliFlags.detail.description}
    --topic         ${cliFlags.topic.description}
    --neutral       ${cliFlags.neutral.description}
    --unfollow      ${cliFlags.unfollow.description}
    --reply         ${cliFlags.reply.description}
    --yes, -y       ${cliFlags.yes.description}
    --type          ${cliFlags.type.description}
    --sort          ${cliFlags.sort.description}
    --comments      ${cliFlags.comments.description}
    --questions     ${cliFlags.questions.description}
    --offset        ${cliFlags.offset.description}

  Supported Platforms
    - Zhihu (知乎):        zhuanlan.zhihu.com, www.zhihu.com
    - CSDN:               blog.csdn.net
    - WeChat (微信公众号):  mp.weixin.qq.com
    - Juejin (掘金):       juejin.cn
    - X (Twitter):        x.com, twitter.com
    - XHS (小红书):        xiaohongshu.com, xhslink.com
    - Bilibili (哔哩哔哩):  bilibili.com, b23.tv
    - Weibo (微博):        weibo.com, m.weibo.cn, s.weibo.com
`;
}
