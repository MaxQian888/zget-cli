export type BiliApiResponse<T> = {
	code: number;
	message: string;
	ttl?: number;
	data: T;
};

export type BiliOwner = {
	mid: number;
	name: string;
	face: string;
};

export type BiliVideoStat = {
	view: number;
	danmaku: number;
	reply: number;
	favorite: number;
	coin: number;
	share: number;
	like: number;
};

export type BiliVideoPage = {
	cid: number;
	page: number;
	part: string;
	duration: number;
};

export type BiliVideoInfo = {
	bvid: string;
	aid: number;
	cid: number;
	title: string;
	desc: string;
	pic: string;
	owner: BiliOwner;
	stat: BiliVideoStat;
	pages: BiliVideoPage[];
	pubdate: number;
	duration: number;
	tname: string;
};

export type BiliSubtitleItem = {
	from: number;
	to: number;
	content: string;
};

export type BiliSubtitleInfo = {
	lan: string;
	lan_doc: string;
	subtitle_url: string;
};

export type BiliSubtitleContent = {
	body: BiliSubtitleItem[];
};

export type BiliComment = {
	rpid: number;
	content: {
		message: string;
	};
	member: {
		uname: string;
		avatar: string;
	};
	ctime: number;
	like: number;
	rcount: number;
};

export type BiliSearchResult = {
	bvid: string;
	title: string;
	author: string;
	play: number;
	description: string;
	pic: string;
	duration: string;
	arcurl: string;
};

export type BiliUserInfo = {
	mid: number;
	name: string;
	face: string;
	sign: string;
	follower: number;
	following: number;
	archive_count?: number;
};

export type BiliUserVideo = {
	bvid: string;
	title: string;
	play: number;
	created: number;
	description: string;
	pic: string;
	length: string;
};

export type BiliRankingItem = {
	bvid: string;
	title: string;
	owner: BiliOwner;
	stat: BiliVideoStat;
	pic: string;
	duration: number;
	score: number;
};

export type BiliRelatedVideo = {
	bvid: string;
	title: string;
	owner: BiliOwner;
	stat: BiliVideoStat;
	pic: string;
	duration: number;
};

export type BiliCookies = {
	[key: string]: string | undefined;
	SESSDATA?: string;
	bili_jct?: string;
	DedeUserID?: string;
};

export type BiliQrCodeData = {
	url: string;
	qrcode_key: string;
};

export type BiliQrCodePollResult = {
	code: number;
	message: string;
	url: string;
	refresh_token: string;
	timestamp: number;
};
