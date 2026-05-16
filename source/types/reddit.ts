// Reddit types
//
// Auth uses OAuth2 password grant for a script-type Reddit app (no redirect URL
// needed). The user creates an app at https://www.reddit.com/prefs/apps,
// captures `client_id` and `client_secret`, and logs in with their Reddit
// `username`/`password`. The CLI exchanges those for an `access_token`
// (1-hour TTL) + `refresh_token`, persists them, and refreshes on 401.
//
// Read endpoints live at https://oauth.reddit.com/* (post-auth) or
// https://www.reddit.com/*.json (pre-auth, public).

export type RedditOauthCreds = {
	clientId: string;
	clientSecret: string;
	username: string;
	accessToken?: string;
	refreshToken?: string;
	tokenExpiresAt?: number; // Unix seconds
};

// Reddit's listing envelope. Most endpoints return either a Thing or a Listing.
export type RedditThing<T> = {
	kind: string; // 't1' = comment, 't3' = post (link), 't2' = user, etc.
	data: T;
};

export type RedditListing<T> = {
	kind: 'Listing';
	data: {
		after?: string;
		before?: string;
		children: Array<RedditThing<T>>;
		dist?: number;
		modhash?: string;
	};
};

export type RedditPost = {
	id: string;
	name?: string; // Fullname (e.g. t3_abc123)
	subreddit: string;
	subreddit_name_prefixed?: string;
	title: string;
	author: string;
	url?: string;
	permalink: string;
	selftext?: string;
	selftext_html?: string;
	score: number;
	num_comments: number;
	created_utc: number;
	over_18?: boolean;
	stickied?: boolean;
	is_self?: boolean;
	is_video?: boolean;
	thumbnail?: string;
	preview?: {
		images?: Array<{source?: {url?: string}}>;
	};
};

export type RedditComment = {
	id: string;
	name?: string; // T1_xxx fullname
	author: string;
	body?: string;
	body_html?: string;
	parent_id?: string;
	link_id?: string;
	score: number;
	created_utc: number;
	replies?: RedditListing<RedditComment> | '';
	depth?: number;
	subreddit?: string;
	link_title?: string;
};

export type RedditUser = {
	id: string;
	name: string;
	created_utc: number;
	link_karma?: number;
	comment_karma?: number;
	total_karma?: number;
	icon_img?: string;
	subreddit?: {
		display_name?: string;
		public_description?: string;
	};
};

export type RedditSubreddit = {
	id?: string;
	name?: string;
	display_name: string;
	display_name_prefixed?: string;
	title?: string;
	public_description?: string;
	description?: string;
	subscribers?: number;
	active_user_count?: number;
	created_utc?: number;
	over18?: boolean;
};

export type RedditInteractResult = {
	success: boolean;
	action: string;
	target: string;
};

export type RedditPublishResult = {
	postId?: string;
	url?: string;
	commentId?: string;
};
