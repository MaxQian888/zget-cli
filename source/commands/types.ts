export type GlobalFlags = {
	output: string;
	verbose: boolean;
	resume: boolean;
	images: boolean;
	cookies?: string;
};

export type CommandName =
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
};
