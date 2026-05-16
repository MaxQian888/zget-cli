export type Platform =
	| 'zhihu'
	| 'csdn'
	| 'weixin'
	| 'juejin'
	| 'x'
	| 'xhs'
	| 'bili'
	| 'weibo'
	| 'reddit'
	| 'hn'
	| 'v2ex'
	| 'douban'
	| 'bsky';

export type ParsedUrl =
	// Zhihu
	| {platform: 'zhihu'; type: 'article'; articleId: string}
	| {platform: 'zhihu'; type: 'answer'; questionId: string; answerId: string}
	| {platform: 'zhihu'; type: 'video'; videoId: string}
	| {platform: 'zhihu'; type: 'column'; columnId: string}
	| {platform: 'zhihu'; type: 'user'; userId: string}
	// CSDN
	| {platform: 'csdn'; type: 'article'; url: string}
	| {platform: 'csdn'; type: 'category'; url: string}
	// WeChat
	| {platform: 'weixin'; type: 'article'; url: string}
	// Juejin
	| {platform: 'juejin'; type: 'article'; url: string}
	// X (Twitter)
	| {platform: 'x'; type: 'tweet'; tweetId: string; username: string}
	| {platform: 'x'; type: 'user'; username: string}
	// XHS (Xiaohongshu)
	| {platform: 'xhs'; type: 'note'; noteId: string}
	| {platform: 'xhs'; type: 'user'; userId: string}
	// Bilibili
	| {platform: 'bili'; type: 'video'; bvid: string}
	| {platform: 'bili'; type: 'user'; mid: string}
	// Weibo (微博)
	| {
			platform: 'weibo';
			type: 'status';
			idstr: string;
			uid?: string;
			isMblogId?: boolean;
	  }
	| {platform: 'weibo'; type: 'user'; uid?: string; screenName?: string}
	// Reddit
	| {
			platform: 'reddit';
			type: 'post';
			subreddit: string;
			postId: string;
			slug?: string;
	  }
	| {platform: 'reddit'; type: 'subreddit'; subreddit: string}
	| {platform: 'reddit'; type: 'user'; username: string}
	// Hacker News
	| {platform: 'hn'; type: 'item'; id: string}
	| {platform: 'hn'; type: 'user'; username: string}
	// V2EX
	| {platform: 'v2ex'; type: 'topic'; topicId: string}
	| {platform: 'v2ex'; type: 'member'; username: string}
	| {platform: 'v2ex'; type: 'node'; nodeName: string}
	// Douban (豆瓣)
	| {platform: 'douban'; type: 'movie'; subjectId: string}
	| {platform: 'douban'; type: 'book'; subjectId: string}
	| {platform: 'douban'; type: 'group-topic'; topicId: string}
	| {platform: 'douban'; type: 'group'; groupId: string}
	| {platform: 'douban'; type: 'people'; userId: string}
	// Bluesky
	| {platform: 'bsky'; type: 'post'; handle: string; rkey: string}
	| {platform: 'bsky'; type: 'profile'; handle: string}
	// Unknown
	| {platform: 'unknown'; type: 'unknown'; raw: string};

export function parseUrl(input: string): ParsedUrl {
	const url = input.trim();

	// --- Zhihu ---
	// Column: zhihu.com/column/xxx
	const columnMatch = /zhihu\.com\/column\/([^/?#]+)/i.exec(url);
	if (columnMatch) {
		return {platform: 'zhihu', type: 'column', columnId: columnMatch[1]!};
	}

	// Answer: zhihu.com/question/xxx/answer/xxx
	const answerMatch = /zhihu\.com\/question\/(\d+)\/answer\/(\d+)/i.exec(url);
	if (answerMatch) {
		return {
			platform: 'zhihu',
			type: 'answer',
			questionId: answerMatch[1]!,
			answerId: answerMatch[2]!,
		};
	}

	// Video: zhihu.com/zvideo/xxx
	const videoMatch = /zhihu\.com\/zvideo\/(\d+)/i.exec(url);
	if (videoMatch) {
		return {platform: 'zhihu', type: 'video', videoId: videoMatch[1]!};
	}

	// User: zhihu.com/people/xxx
	const userMatch = /zhihu\.com\/people\/([^/?#]+)/i.exec(url);
	if (userMatch) {
		return {platform: 'zhihu', type: 'user', userId: userMatch[1]!};
	}

	// Article: zhuanlan.zhihu.com/p/xxx
	const zhihuArticle = /zhuanlan\.zhihu\.com\/p\/(\d+)/i.exec(url);
	if (zhihuArticle) {
		return {platform: 'zhihu', type: 'article', articleId: zhihuArticle[1]!};
	}

	// Article fallback: zhihu.com/p/xxx
	const zhihuArticle2 = /zhihu\.com\/p\/(\d+)/i.exec(url);
	if (zhihuArticle2) {
		return {platform: 'zhihu', type: 'article', articleId: zhihuArticle2[1]!};
	}

	// --- CSDN ---
	// Category: blog.csdn.net/xxx/category_xxx.html
	if (/blog\.csdn\.net\/.+\/category_/i.test(url)) {
		return {platform: 'csdn', type: 'category', url};
	}

	// Article: blog.csdn.net/xxx/article/details/xxx
	if (/blog\.csdn\.net\/.+\/article\/details\//i.test(url)) {
		return {platform: 'csdn', type: 'article', url};
	}

	// --- WeChat ---
	if (/mp\.weixin\.qq\.com\/s/i.test(url)) {
		return {platform: 'weixin', type: 'article', url};
	}

	// --- Juejin ---
	if (/juejin\.cn\/post\//i.test(url)) {
		return {platform: 'juejin', type: 'article', url};
	}

	// --- X (Twitter) ---
	// Tweet: x.com/<user>/status/<id> or twitter.com/<user>/status/<id>
	const xTweetMatch = /(?:x\.com|twitter\.com)\/([^/?#]+)\/status\/(\d+)/i.exec(
		url,
	);
	if (xTweetMatch) {
		return {
			platform: 'x',
			type: 'tweet',
			username: xTweetMatch[1]!,
			tweetId: xTweetMatch[2]!,
		};
	}

	// User: x.com/<user> or twitter.com/<user>
	const xUserMatch = /(?:x\.com|twitter\.com)\/(\w+)\/?$/i.exec(url);
	if (xUserMatch) {
		return {platform: 'x', type: 'user', username: xUserMatch[1]!};
	}

	// --- XHS (Xiaohongshu) ---
	// Note: xiaohongshu.com/explore/<id> or xiaohongshu.com/discovery/item/<id>
	const xhsNoteMatch =
		/xiaohongshu\.com\/(?:explore|discovery\/item)\/([a-f\d]+)/i.exec(url);
	if (xhsNoteMatch) {
		return {platform: 'xhs', type: 'note', noteId: xhsNoteMatch[1]!};
	}

	// Short link: xhslink.com/<code>
	// Pass the full URL through as the noteId so downstream callers can detect
	// it (starts with http/https) and resolve via the 302 redirect.
	if (/xhslink\.com\//i.test(url)) {
		return {platform: 'xhs', type: 'note', noteId: url};
	}

	// User: xiaohongshu.com/user/profile/<id>
	const xhsUserMatch = /xiaohongshu\.com\/user\/profile\/([a-f\d]+)/i.exec(url);
	if (xhsUserMatch) {
		return {platform: 'xhs', type: 'user', userId: xhsUserMatch[1]!};
	}

	// --- Bilibili ---
	// Video: bilibili.com/video/BVxxx or b23.tv/BVxxx
	const biliVideoMatch = /bilibili\.com\/video\/(bv[a-z\d]+)/i.exec(url);
	if (biliVideoMatch) {
		return {platform: 'bili', type: 'video', bvid: biliVideoMatch[1]!};
	}

	// Short link with BV: b23.tv/BVxxx
	const b23BvMatch = /b23\.tv\/(bv[a-z\d]+)/i.exec(url);
	if (b23BvMatch) {
		return {platform: 'bili', type: 'video', bvid: b23BvMatch[1]!};
	}

	// User space: space.bilibili.com/<mid>
	const biliUserMatch = /space\.bilibili\.com\/(\d+)/i.exec(url);
	if (biliUserMatch) {
		return {platform: 'bili', type: 'user', mid: biliUserMatch[1]!};
	}

	// --- Weibo (微博) ---
	// Status (mobile): m.weibo.cn/status/<idstr>
	const weiboMobileStatusMatch = /m\.weibo\.cn\/status\/([\w]+)/i.exec(url);
	if (weiboMobileStatusMatch) {
		return {
			platform: 'weibo',
			type: 'status',
			idstr: weiboMobileStatusMatch[1]!,
		};
	}

	// Status (mobile detail): m.weibo.cn/detail/<idstr>
	const weiboMobileDetailMatch = /m\.weibo\.cn\/detail\/([\w]+)/i.exec(url);
	if (weiboMobileDetailMatch) {
		return {
			platform: 'weibo',
			type: 'status',
			idstr: weiboMobileDetailMatch[1]!,
		};
	}

	// User profile (mobile): m.weibo.cn/u/<uid> or m.weibo.cn/profile/<uid>
	const weiboMobileUserMatch = /m\.weibo\.cn\/(?:u|profile)\/(\d+)/i.exec(url);
	if (weiboMobileUserMatch) {
		return {platform: 'weibo', type: 'user', uid: weiboMobileUserMatch[1]!};
	}

	// Status (desktop): weibo.com/<uid>/<mblogid> — uid digits, mblogid is alnum
	const weiboDesktopStatusMatch =
		/(?:^|\/\/|\s)weibo\.com\/(\d+)\/([A-Za-z\d]{6,})(?:[/?#]|$)/i.exec(url);
	if (weiboDesktopStatusMatch) {
		return {
			platform: 'weibo',
			type: 'status',
			idstr: weiboDesktopStatusMatch[2]!,
			uid: weiboDesktopStatusMatch[1]!,
			isMblogId: true,
		};
	}

	// User profile (desktop): weibo.com/u/<uid>
	const weiboDesktopUserMatch = /weibo\.com\/u\/(\d+)/i.exec(url);
	if (weiboDesktopUserMatch) {
		return {platform: 'weibo', type: 'user', uid: weiboDesktopUserMatch[1]!};
	}

	// User by screen name: weibo.com/n/<name>
	const weiboNameMatch = /weibo\.com\/n\/([^/?#]+)/i.exec(url);
	if (weiboNameMatch) {
		return {
			platform: 'weibo',
			type: 'user',
			screenName: decodeURIComponent(weiboNameMatch[1]!),
		};
	}

	// --- Reddit ---
	// Post: reddit.com/r/<sub>/comments/<id>/<slug>?
	const redditPostMatch =
		/reddit\.com\/r\/([^/?#]+)\/comments\/([a-z\d]+)(?:\/([^/?#]+))?/i.exec(
			url,
		);
	if (redditPostMatch) {
		return {
			platform: 'reddit',
			type: 'post',
			subreddit: redditPostMatch[1]!,
			postId: redditPostMatch[2]!,
			slug: redditPostMatch[3],
		};
	}

	// Short link: redd.it/<id>
	const reddItMatch = /redd\.it\/([a-z\d]+)/i.exec(url);
	if (reddItMatch) {
		return {
			platform: 'reddit',
			type: 'post',
			subreddit: '',
			postId: reddItMatch[1]!,
		};
	}

	// User: reddit.com/user/<name> or reddit.com/u/<name>
	const redditUserMatch = /reddit\.com\/(?:user|u)\/([^/?#]+)/i.exec(url);
	if (redditUserMatch) {
		return {platform: 'reddit', type: 'user', username: redditUserMatch[1]!};
	}

	// Subreddit: reddit.com/r/<sub>
	const redditSubMatch = /reddit\.com\/r\/([^/?#]+)/i.exec(url);
	if (redditSubMatch) {
		return {
			platform: 'reddit',
			type: 'subreddit',
			subreddit: redditSubMatch[1]!,
		};
	}

	// --- Hacker News ---
	// Item: news.ycombinator.com/item?id=<n>
	const hnItemMatch = /news\.ycombinator\.com\/item\?id=(\d+)/i.exec(url);
	if (hnItemMatch) {
		return {platform: 'hn', type: 'item', id: hnItemMatch[1]!};
	}

	// User: news.ycombinator.com/user?id=<name>
	const hnUserMatch = /news\.ycombinator\.com\/user\?id=([^&#]+)/i.exec(url);
	if (hnUserMatch) {
		return {platform: 'hn', type: 'user', username: hnUserMatch[1]!};
	}

	// --- V2EX ---
	// Topic: v2ex.com/t/<id>
	const v2exTopicMatch = /v2ex\.com\/t\/(\d+)/i.exec(url);
	if (v2exTopicMatch) {
		return {platform: 'v2ex', type: 'topic', topicId: v2exTopicMatch[1]!};
	}

	// Member: v2ex.com/member/<name>
	const v2exMemberMatch = /v2ex\.com\/member\/([^/?#]+)/i.exec(url);
	if (v2exMemberMatch) {
		return {platform: 'v2ex', type: 'member', username: v2exMemberMatch[1]!};
	}

	// Node: v2ex.com/go/<node>
	const v2exNodeMatch = /v2ex\.com\/go\/([^/?#]+)/i.exec(url);
	if (v2exNodeMatch) {
		return {platform: 'v2ex', type: 'node', nodeName: v2exNodeMatch[1]!};
	}

	// --- Douban (豆瓣) ---
	// Movie: movie.douban.com/subject/<id>
	const doubanMovieMatch = /movie\.douban\.com\/subject\/(\d+)/i.exec(url);
	if (doubanMovieMatch) {
		return {platform: 'douban', type: 'movie', subjectId: doubanMovieMatch[1]!};
	}

	// Book: book.douban.com/subject/<id>
	const doubanBookMatch = /book\.douban\.com\/subject\/(\d+)/i.exec(url);
	if (doubanBookMatch) {
		return {platform: 'douban', type: 'book', subjectId: doubanBookMatch[1]!};
	}

	// Group topic: douban.com/group/topic/<id>
	const doubanGroupTopicMatch = /douban\.com\/group\/topic\/(\d+)/i.exec(url);
	if (doubanGroupTopicMatch) {
		return {
			platform: 'douban',
			type: 'group-topic',
			topicId: doubanGroupTopicMatch[1]!,
		};
	}

	// Group: douban.com/group/<name-or-id>
	const doubanGroupMatch = /douban\.com\/group\/([^/?#]+)/i.exec(url);
	if (doubanGroupMatch) {
		return {platform: 'douban', type: 'group', groupId: doubanGroupMatch[1]!};
	}

	// People: douban.com/people/<id>
	const doubanPeopleMatch = /douban\.com\/people\/([^/?#]+)/i.exec(url);
	if (doubanPeopleMatch) {
		return {platform: 'douban', type: 'people', userId: doubanPeopleMatch[1]!};
	}

	// --- Bluesky ---
	// Post: bsky.app/profile/<handle>/post/<rkey>
	const bskyPostMatch = /bsky\.app\/profile\/([^/?#]+)\/post\/([^/?#]+)/i.exec(
		url,
	);
	if (bskyPostMatch) {
		return {
			platform: 'bsky',
			type: 'post',
			handle: bskyPostMatch[1]!,
			rkey: bskyPostMatch[2]!,
		};
	}

	// Profile: bsky.app/profile/<handle>
	const bskyProfileMatch = /bsky\.app\/profile\/([^/?#]+)/i.exec(url);
	if (bskyProfileMatch) {
		return {platform: 'bsky', type: 'profile', handle: bskyProfileMatch[1]!};
	}

	return {platform: 'unknown', type: 'unknown', raw: url};
}

// Keep backward compatibility
export type ParsedZhihuUrl = ParsedUrl;
export const parseZhihuUrl = parseUrl;

export function buildArticleUrl(articleId: string): string {
	return `https://zhuanlan.zhihu.com/p/${articleId}`;
}

export function buildAnswerUrl(questionId: string, answerId: string): string {
	return `https://www.zhihu.com/question/${questionId}/answer/${answerId}`;
}

export function buildVideoUrl(videoId: string): string {
	return `https://www.zhihu.com/zvideo/${videoId}`;
}

export function buildColumnUrl(columnId: string): string {
	return `https://www.zhihu.com/column/${columnId}`;
}

export function buildUserUrl(userId: string): string {
	return `https://www.zhihu.com/people/${userId}`;
}

export function buildBiliVideoUrl(bvid: string): string {
	return `https://www.bilibili.com/video/${bvid}`;
}

export function buildBiliUserUrl(mid: string): string {
	return `https://space.bilibili.com/${mid}`;
}

export function buildWeiboStatusUrl(idstr: string, uid?: string): string {
	if (uid) return `https://weibo.com/${uid}/${idstr}`;
	return `https://m.weibo.cn/status/${idstr}`;
}

export function buildWeiboUserUrl(uid: string): string {
	return `https://weibo.com/u/${uid}`;
}

export function buildRedditPostUrl(subreddit: string, postId: string): string {
	return `https://www.reddit.com/r/${subreddit}/comments/${postId}`;
}

export function buildRedditUserUrl(username: string): string {
	return `https://www.reddit.com/user/${username}`;
}

export function buildRedditSubredditUrl(subreddit: string): string {
	return `https://www.reddit.com/r/${subreddit}`;
}

export function buildHnItemUrl(id: string): string {
	return `https://news.ycombinator.com/item?id=${id}`;
}

export function buildHnUserUrl(username: string): string {
	return `https://news.ycombinator.com/user?id=${username}`;
}

export function buildV2exTopicUrl(topicId: string): string {
	return `https://v2ex.com/t/${topicId}`;
}

export function buildV2exMemberUrl(username: string): string {
	return `https://v2ex.com/member/${username}`;
}

export function buildV2exNodeUrl(nodeName: string): string {
	return `https://v2ex.com/go/${nodeName}`;
}

export function buildDoubanMovieUrl(subjectId: string): string {
	return `https://movie.douban.com/subject/${subjectId}/`;
}

export function buildDoubanBookUrl(subjectId: string): string {
	return `https://book.douban.com/subject/${subjectId}/`;
}

export function buildDoubanGroupTopicUrl(topicId: string): string {
	return `https://www.douban.com/group/topic/${topicId}/`;
}

export function buildBskyPostUrl(handle: string, rkey: string): string {
	return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

export function buildBskyProfileUrl(handle: string): string {
	return `https://bsky.app/profile/${handle}`;
}

export function getPlatformName(platform: Platform | 'unknown'): string {
	const names: Record<string, string> = {
		zhihu: '知乎',
		csdn: 'CSDN',
		weixin: '微信公众号',
		juejin: '掘金',
		x: 'X (Twitter)',
		xhs: '小红书',
		bili: 'Bilibili (哔哩哔哩)',
		weibo: '微博',
		reddit: 'Reddit',
		hn: 'Hacker News',
		v2ex: 'V2EX',
		douban: '豆瓣',
		bsky: 'Bluesky',
		unknown: '未知',
	};
	return names[platform] ?? platform;
}
