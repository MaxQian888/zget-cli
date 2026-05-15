export type WeiboCookies = {
	[key: string]: string | undefined;
	SUB?: string;
	SUBP?: string;
	SSOLoginState?: string;
	'XSRF-TOKEN'?: string;
	WBPSESS?: string;
	ALF?: string;
};

export type WeiboApiResponse<T> = {
	ok: number;
	data?: T;
	msg?: string;
	url?: string;
};

export type WeiboUser = {
	id: number;
	idstr: string;
	screen_name: string;
	name?: string;
	avatar_large?: string;
	avatar_hd?: string;
	profile_image_url?: string;
	profile_url?: string;
	description?: string;
	gender?: 'm' | 'f' | 'n';
	verified?: boolean;
	verified_reason?: string;
	followers_count?: number;
	friends_count?: number;
	statuses_count?: number;
	location?: string;
	created_at?: string;
	following?: boolean;
};

export type WeiboUserDetail = {
	birthday?: string;
	created_at?: string;
	description?: string;
	gender?: string;
	ip_location?: string;
	sunshine_credit?: {level?: string};
	label_desc?: Array<{name: string}>;
	company?: string;
	education?: string;
};

export type WeiboPicLargest = {
	url?: string;
	width?: number;
	height?: number;
};

export type WeiboPicInfo = {
	pic_id?: string;
	thumbnail?: WeiboPicLargest;
	bmiddle?: WeiboPicLargest;
	large?: WeiboPicLargest;
	original?: WeiboPicLargest;
	largest?: WeiboPicLargest;
	mw2000?: WeiboPicLargest;
	type?: string;
	video?: string;
};

export type WeiboPageInfo = {
	type?: string;
	page_pic?: string;
	page_title?: string;
	page_url?: string;
	media_info?: {
		stream_url?: string;
		stream_url_hd?: string;
		mp4_sd_url?: string;
		mp4_hd_url?: string;
		duration?: number;
	};
	urls?: {
		mp4_sd_mp4?: string;
		mp4_hd_mp4?: string;
		mp4_720p_mp4?: string;
	};
};

export type WeiboStatus = {
	id: number;
	idstr: string;
	mid: string;
	mblogid?: string;
	created_at: string;
	user?: WeiboUser;
	text?: string;
	text_raw?: string;
	source?: string;
	pic_ids?: string[];
	pic_infos?: Record<string, WeiboPicInfo>;
	pic_num?: number;
	page_info?: WeiboPageInfo;
	reposts_count?: number;
	comments_count?: number;
	attitudes_count?: number;
	isLongText?: boolean;
	is_long_text?: boolean;
	retweeted_status?: WeiboStatus;
	region_name?: string;
	favorited?: boolean;
	url?: string;
};

export type WeiboLongText = {
	longTextContent?: string;
};

export type WeiboHotItem = {
	rank: number;
	word: string;
	hot_value: number;
	category: string;
	label: string;
	url: string;
};

export type WeiboHotBandRaw = {
	realpos?: number;
	word?: string;
	num?: number;
	category?: string;
	label_name?: string;
};

export type WeiboCommentEntry = {
	id: number;
	idstr?: string;
	created_at: string;
	text: string;
	text_raw?: string;
	source?: string;
	user?: WeiboUser;
	like_counts?: number;
	total_number?: number;
	reply_comment?: WeiboCommentEntry;
};

export type WeiboSearchResult = {
	mid: string;
	url?: string;
	user_screen_name?: string;
	user_url?: string;
	text: string;
	source?: string;
};

export type WeiboFeedKind = 'for-you' | 'following';

export type WeiboQrCodeImage = {
	qrid: string;
	imageUrl: string;
};

export type WeiboQrPollResult = {
	retcode: number;
	msg?: string;
	data?: {
		alt?: string;
		signin_url?: string;
	};
};

export type WeiboPublishResult = {
	mid: string;
	idstr: string;
	mblogid?: string;
	url: string;
};

export type WeiboLikeResult = {
	success: boolean;
	action: 'like' | 'unlike';
	target: string;
};

export type WeiboInteractResult = {
	success: boolean;
	action: string;
	target: string;
};
