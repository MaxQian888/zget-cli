export type ZhihuAuthor = {
	name: string;
	urlToken: string;
	avatarUrl?: string;
	headline?: string;
};

export type ZhihuArticle = {
	id: number;
	title: string;
	content: string;
	author: ZhihuAuthor;
	created: number;
	updated: number;
	voteupCount: number;
	commentCount: number;
	url: string;
};

export type ZhihuAnswer = {
	id: number;
	content: string;
	author: ZhihuAuthor;
	question: {
		id: number;
		title: string;
	};
	created: number;
	updated: number;
	voteupCount: number;
	commentCount: number;
	url: string;
};

export type ZhihuVideoPlayInfo = {
	playUrl: string;
	width: number;
	height: number;
	quality: string;
	size: number;
};

export type ZhihuVideo = {
	id: string;
	title: string;
	author: ZhihuAuthor;
	video: {
		playlist: Record<string, ZhihuVideoPlayInfo>;
	};
	created: number;
};

export type ZhihuColumnItem = {
	id: number;
	type: 'article' | 'answer' | 'zvideo';
	title?: string;
	url?: string;
	question?: {id: number};
};

export type ZhihuPaging = {
	is_end: boolean;
	next: string;
	previous: string;
	totals?: number;
};

export type ZhihuPaginatedResponse<T> = {
	data: T[];
	paging: ZhihuPaging;
};

export type ZhihuUserProfile = {
	id: string;
	name: string;
	urlToken: string;
	headline: string;
	avatarUrl: string;
	answerCount: number;
	articlesCount: number;
	followerCount: number;
};

export type QrCodeData = {
	token: string;
	link: string;
};

export type QrScanStatus =
	| 'waiting'
	| 'scanned'
	| 'confirmed'
	| 'expired'
	| 'error';

export type ZhihuMe = {
	id: string;
	name: string;
	urlToken: string;
	headline: string;
	avatarUrl: string;
	email?: string;
};

export type ZhihuComment = {
	id: string;
	content: string;
	author: ZhihuAuthor;
	created: number;
	likeCount: number;
	replyTo?: {id: string; author: ZhihuAuthor};
};

export type ZhihuFollowerRow = {
	id: string;
	name: string;
	urlToken: string;
	headline: string;
	avatarUrl: string;
	followerCount?: number;
};

export type ZhihuCollectionRow = {
	id: string;
	title: string;
	description: string;
	answerCount: number;
	followerCount: number;
	url: string;
};

export type ZhihuNotificationRow = {
	id: string;
	type: string;
	content: string;
	created: number;
	read: boolean;
	url?: string;
};

export type ZhihuDraftRow = {
	id: string;
	title: string;
	updated: number;
	url?: string;
};

// Image info returned by the upload pipeline, used to build the `hybrid`
// HTML payload that ask/pin/article publish endpoints expect.
export type ZhihuImageInfo = {
	imageId: string;
	src: string;
	originalSrc: string;
	width: number;
	height: number;
	watermark?: string;
	watermarkSrc?: string;
};

export type ZhihuPublishResult = {
	id: string;
	url?: string;
	type: 'question' | 'pin' | 'article' | 'comment';
};

export type ZhihuVoteType = 'up' | 'down' | 'neutral';

export type ZhihuFollowTarget = 'user' | 'question' | 'column';

export type ZhihuCommentTarget = 'answer' | 'article' | 'question' | 'pin';

export type ZhihuSearchType = 'general' | 'topic' | 'people';

export type ZhihuAnswerSort = 'default' | 'updated' | 'voteups' | 'created';
