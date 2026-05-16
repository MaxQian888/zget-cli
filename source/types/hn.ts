// Hacker News types
//
// The read path uses two distinct public APIs:
// - Firebase JSON (https://hacker-news.firebaseio.com/v0/...) — items, users, list IDs
// - Algolia search (https://hn.algolia.com/api/v1/search) — full-text search
//
// The write path is cookie-based against news.ycombinator.com. Each write
// endpoint requires an `auth` token scraped from the rendered page.

export type HnCookies = {
	user?: string; // Single cookie HN sets after successful login
};

export type HnItemType = 'story' | 'comment' | 'job' | 'poll' | 'pollopt';

export type HnItem = {
	id: number;
	deleted?: boolean;
	type?: HnItemType;
	by?: string;
	time?: number;
	text?: string;
	dead?: boolean;
	parent?: number;
	poll?: number;
	kids?: number[];
	url?: string;
	score?: number;
	title?: string;
	parts?: number[];
	descendants?: number;
};

export type HnUser = {
	id: string; // Username
	created: number;
	karma: number;
	about?: string;
	submitted?: number[];
};

export type HnListKind =
	| 'top'
	| 'best'
	| 'new'
	| 'ask'
	| 'show'
	| 'job'
	| 'updates';

// Algolia search result
export type HnAlgoliaHit = {
	objectID: string;
	author?: string;
	created_at?: string;
	created_at_i?: number;
	title?: string;
	url?: string;
	points?: number;
	num_comments?: number;
	story_text?: string;
	comment_text?: string;
	parent_id?: number;
	story_id?: number;
	_tags?: string[];
};

export type HnAlgoliaResponse = {
	hits: HnAlgoliaHit[];
	nbHits: number;
	page: number;
	nbPages: number;
	hitsPerPage: number;
	processingTimeMS?: number;
	query?: string;
};

export type HnSubmitResult = {
	itemId?: number;
	url: string;
};

export type HnInteractResult = {
	success: boolean;
	action: string;
	target: string;
};
