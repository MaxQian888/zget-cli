// XHS (Xiaohongshu) data types

export type XhsNoteImage = {
	url: string;
	width?: number;
	height?: number;
	traceId?: string;
};

export type XhsNoteTag = {
	id: string;
	name: string;
	type?: string;
};

export type XhsUser = {
	userId: string;
	nickname: string;
	avatar?: string;
	description?: string;
	gender?: number;
	ipLocation?: string;
	followerCount?: number;
	followingCount?: number;
	noteCount?: number;
	likeCount?: number;
	collectedCount?: number;
};

export type XhsComment = {
	id: string;
	content: string;
	userId: string;
	nickname: string;
	avatar?: string;
	createTime: string;
	likeCount?: number;
	subComments?: XhsComment[];
};

export type XhsNote = {
	noteId: string;
	title: string;
	description: string;
	type: 'normal' | 'video';
	user: XhsUser;
	imageList: XhsNoteImage[];
	videoUrl?: string;
	tags: XhsNoteTag[];
	createTime: string;
	updateTime?: string;
	likeCount: number;
	collectCount: number;
	commentCount: number;
	shareCount: number;
	xsecToken?: string;
};

export type XhsSearchResult = {
	noteId: string;
	title: string;
	description: string;
	user: {
		userId: string;
		nickname: string;
		avatar?: string;
	};
	likeCount: number;
	imageUrl?: string;
	xsecToken?: string;
};

export type XhsFeedItem = {
	noteId: string;
	title: string;
	description: string;
	user: {
		userId: string;
		nickname: string;
	};
	likeCount: number;
	imageUrl?: string;
	xsecToken?: string;
};

export type XhsTopic = {
	id: string;
	name: string;
	description?: string;
	noteCount?: number;
	viewCount?: number;
};

export type XhsCookies = {
	[key: string]: string | undefined;
	a1?: string;
	web_session?: string;
	webId?: string;
};

export type XhsTokenEntry = {
	token: string;
	timestamp: number;
};
