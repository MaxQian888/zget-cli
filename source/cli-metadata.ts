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
};

export function buildCliHelpText(): string {
	return `
  Usage
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
    $ ${cliName} search <query>              Search Zhihu
    $ ${cliName} hot                         Show trending (热榜)
    $ ${cliName} question <id>               Show question details
    $ ${cliName} answers <question_id>       Show answers to a question
    $ ${cliName} feed                        Show recommended feed
    $ ${cliName} topic <id>                  Show topic details
    $ ${cliName} user-info <username>        Show user profile
    $ ${cliName} user-answers <username>     Show user's answers
    $ ${cliName} user-articles <username>    Show user's articles

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

  Supported Platforms
    - Zhihu (知乎):        zhuanlan.zhihu.com, www.zhihu.com
    - CSDN:               blog.csdn.net
    - WeChat (微信公众号):  mp.weixin.qq.com
    - Juejin (掘金):       juejin.cn
    - X (Twitter):        x.com, twitter.com
    - XHS (小红书):        xiaohongshu.com, xhslink.com
    - Bilibili (哔哩哔哩):  bilibili.com, b23.tv
`;
}
