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
