// X (Twitter) API v2 types

type TweetPublicMetrics = {
	retweet_count: number;
	reply_count: number;
	like_count: number;
	quote_count: number;
	bookmark_count?: number;
	impression_count?: number;
};

type TweetMedia = {
	media_key: string;
	type: 'photo' | 'video' | 'animated_gif';
	url?: string;
	preview_image_url?: string;
};

type Tweet = {
	id: string;
	text: string;
	author_id?: string;
	created_at?: string;
	public_metrics?: TweetPublicMetrics;
	referenced_tweets?: Array<{
		type: 'retweeted' | 'quoted' | 'replied_to';
		id: string;
	}>;
	attachments?: {
		media_keys?: string[];
	};
	conversation_id?: string;
};

type UserPublicMetrics = {
	followers_count: number;
	following_count: number;
	tweet_count: number;
	listed_count: number;
};

type User = {
	id: string;
	name: string;
	username: string;
	description?: string;
	public_metrics?: UserPublicMetrics;
	profile_image_url?: string;
	created_at?: string;
	verified?: boolean;
	location?: string;
	url?: string;
};

type ApiResponse<T> = {
	data: T;
	includes?: {
		users?: User[];
		tweets?: Tweet[];
		media?: TweetMedia[];
	};
	meta?: {
		next_token?: string;
		result_count?: number;
		newest_id?: string;
		oldest_id?: string;
	};
	errors?: Array<{
		title: string;
		detail: string;
		type: string;
	}>;
};

type Credentials = {
	apiKey: string;
	apiSecret: string;
	bearerToken: string;
	accessToken: string;
	accessTokenSecret: string;
};

export type {
	ApiResponse as XApiResponse,
	Credentials as XCredentials,
	Tweet as XTweet,
	TweetMedia as XTweetMedia,
	TweetPublicMetrics as XTweetPublicMetrics,
	User as XUser,
	UserPublicMetrics as XUserPublicMetrics,
};
