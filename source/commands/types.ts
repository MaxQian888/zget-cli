export type GlobalFlags = {
	output: string;
	verbose: boolean;
	resume: boolean;
	images: boolean;
	cookies?: string;
};

export type CommandName =
	// Interactive UI
	| 'ui-home'
	| 'ui-account-center'
	| 'ui-account-platform'
	// Download
	| 'login'
	| 'article'
	| 'answer'
	| 'video'
	| 'column'
	| 'user'
	| 'csdn'
	| 'weixin'
	| 'juejin'
	// Browse
	| 'search'
	| 'hot'
	| 'question'
	| 'answers'
	| 'feed'
	| 'topic'
	| 'user-info'
	| 'user-answers'
	| 'user-articles'
	// X (Twitter)
	| 'x-search'
	| 'x-user'
	| 'x-timeline'
	| 'x-followers'
	| 'x-following'
	| 'x-mentions'
	| 'x-bookmarks'
	| 'x-post'
	| 'x-reply'
	| 'x-quote'
	| 'x-delete'
	| 'x-like'
	| 'x-retweet'
	| 'x-tweet'
	| 'x-metrics'
	| 'x-login'
	// XHS (Xiaohongshu)
	| 'xhs-search'
	| 'xhs-read'
	| 'xhs-feed'
	| 'xhs-topics'
	| 'xhs-user'
	| 'xhs-posts'
	| 'xhs-followers'
	| 'xhs-following'
	| 'xhs-like'
	| 'xhs-unlike'
	| 'xhs-favorite'
	| 'xhs-unfavorite'
	| 'xhs-comment'
	| 'xhs-delete'
	| 'xhs-post'
	| 'xhs-login'
	| 'xhs-download'
	| 'xhs-whoami'
	| 'xhs-favorites'
	| 'xhs-logout'
	// Bilibili
	| 'bili-search'
	| 'bili-video'
	| 'bili-user'
	| 'bili-videos'
	| 'bili-hot'
	| 'bili-ranking'
	| 'bili-related'
	| 'bili-comments'
	| 'bili-like'
	| 'bili-coin'
	| 'bili-triple'
	| 'bili-login'
	| 'bili-whoami'
	| 'bili-logout'
	| 'bili-download'
	// Weibo (微博)
	| 'weibo-login'
	| 'weibo-logout'
	| 'weibo-whoami'
	| 'weibo-hot'
	| 'weibo-search'
	| 'weibo-feed'
	| 'weibo-read'
	| 'weibo-comments'
	| 'weibo-user'
	| 'weibo-posts'
	| 'weibo-favorites'
	| 'weibo-followers'
	| 'weibo-following'
	| 'weibo-like'
	| 'weibo-unlike'
	| 'weibo-repost'
	| 'weibo-comment'
	| 'weibo-delete'
	| 'weibo-follow'
	| 'weibo-unfollow'
	| 'weibo-post'
	| 'weibo-download'
	// Zhihu Account
	| 'zhihu-login'
	| 'zhihu-logout'
	| 'zhihu-whoami'
	| 'zhihu-status'
	// Zhihu Interact
	| 'zhihu-vote'
	| 'zhihu-follow'
	| 'zhihu-unfollow'
	| 'zhihu-comment'
	| 'zhihu-comments'
	| 'zhihu-uncomment'
	// Zhihu Lists
	| 'zhihu-followers'
	| 'zhihu-following'
	| 'zhihu-collections'
	| 'zhihu-notifications'
	| 'zhihu-drafts'
	// Zhihu Create
	| 'zhihu-ask'
	| 'zhihu-pin'
	| 'zhihu-publish-article'
	// Zhihu Delete
	| 'zhihu-delete-question'
	| 'zhihu-delete-pin'
	| 'zhihu-delete-article'
	// AI Summary
	| 'summary'
	// Meta
	| 'help'
	| 'download';

export type ResolvedCommand = {
	command: CommandName;
	url?: string;
	flags: GlobalFlags;
	limit?: number;
	text?: string;
	extraArgs?: string[];
	format?: 'human' | 'json';
	images?: string[];
	content?: string;
	// Zhihu-specific options propagated from CLI flags
	cookie?: string;
	detail?: string;
	topics?: string[];
	neutral?: boolean;
	unfollow?: boolean;
	reply?: string;
	yes?: boolean;
	searchType?: string;
	sortBy?: string;
	includeComments?: boolean;
	includeQuestions?: boolean;
	offset?: number;
};
