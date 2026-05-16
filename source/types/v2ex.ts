// V2EX types
//
// V2EX exposes two API surfaces:
// - /api/v2/* — modern, Personal Access Token (PAT) via Authorization: Bearer
//   Used for: member profile, notifications, my topics, collect/thank, replies.
// - /api/topics/show.json, /api/replies/show.json — legacy, public, JSON.
//   Used for read-only topic + replies hydration that v2 doesn't cover well.

export type V2exToken = {
	token: string;
};

export type V2exApiV2Envelope<T> = {
	success: boolean;
	message?: string;
	result?: T;
};

export type V2exMember = {
	id: number;
	username: string;
	url?: string;
	website?: string;
	twitter?: string;
	psn?: string;
	github?: string;
	btc?: string;
	location?: string;
	tagline?: string;
	bio?: string;
	avatar_mini?: string;
	avatar_normal?: string;
	avatar_large?: string;
	avatar_xlarge?: string;
	avatar_xxlarge?: string;
	created?: number;
	last_modified?: number;
};

export type V2exNode = {
	id: number;
	name: string;
	url?: string;
	title: string;
	title_alternative?: string;
	topics?: number;
	footer?: string;
	header?: string;
	stars?: number;
	aliases?: string[];
	root?: boolean;
	parent_node_name?: string;
};

export type V2exTopic = {
	id: number;
	title: string;
	content?: string;
	content_rendered?: string;
	syntax?: number;
	url?: string;
	replies: number;
	last_reply_by?: string;
	created: number;
	last_modified?: number;
	last_touched?: number;
	member?: V2exMember;
	node?: V2exNode;
	supplements?: Array<{
		id: number;
		content?: string;
		content_rendered?: string;
		syntax?: number;
		created?: number;
	}>;
};

export type V2exReply = {
	id: number;
	content?: string;
	content_rendered?: string;
	created: number;
	last_modified?: number;
	member?: V2exMember;
	thanks?: number;
};

export type V2exNotification = {
	id: number;
	member_id?: number;
	for_member_id?: number;
	text?: string;
	payload?: string;
	payload_rendered?: string;
	created: number;
	member?: {username: string; avatar_mini?: string};
};

export type V2exPublishResult = {
	topicId: number;
	url: string;
};

export type V2exInteractResult = {
	success: boolean;
	action: string;
	target: string;
	message?: string;
};
