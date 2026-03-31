import {generateOAuthHeader, type XCredentialStore} from '../auth/x-auth';
import type {XApiResponse, XTweet, XUser} from './x-types';

const baseUrl = 'https://api.x.com/2';
const tweetFields =
	'created_at,public_metrics,author_id,conversation_id,referenced_tweets,attachments';
const userFields =
	'name,username,description,public_metrics,profile_image_url,created_at,verified,location,url';
const expansions = 'author_id,referenced_tweets.id';
const authorizationHeader = 'Authorization';
const contentTypeHeader = 'Content-Type';
const jsonContentType = 'application/json';
const tweetFieldsKey = 'tweet.fields';
const userFieldsKey = 'user.fields';
const maxResultsKey = 'max_results';
const inReplyToTweetIdKey = 'in_reply_to_tweet_id';
const quoteTweetIdKey = 'quote_tweet_id';
const tweetIdKey = 'tweet_id';

class TwitterApiClient {
	private lastRequestTime = 0;

	private get rateLimit(): number {
		return 500;
	}

	constructor(private readonly credentialStore: XCredentialStore) {}

	async getTweet(tweetId: string): Promise<XApiResponse<XTweet>> {
		return this.fetchWithBearer<XApiResponse<XTweet>>(`/tweets/${tweetId}`, {
			[tweetFieldsKey]: tweetFields,
			[userFieldsKey]: userFields,
			expansions,
		});
	}

	async searchRecent(
		query: string,
		maxResults = 10,
	): Promise<XApiResponse<XTweet[]>> {
		return this.fetchWithBearer<XApiResponse<XTweet[]>>(
			'/tweets/search/recent',
			{
				query,
				[maxResultsKey]: String(Math.min(Math.max(maxResults, 10), 100)),
				[tweetFieldsKey]: tweetFields,
				[userFieldsKey]: userFields,
				expansions,
			},
		);
	}

	async getUserByUsername(username: string): Promise<XApiResponse<XUser>> {
		return this.fetchWithBearer<XApiResponse<XUser>>(
			`/users/by/username/${username}`,
			{
				[userFieldsKey]: userFields,
			},
		);
	}

	async getUserTimeline(
		userId: string,
		maxResults = 10,
	): Promise<XApiResponse<XTweet[]>> {
		return this.fetchWithBearer<XApiResponse<XTweet[]>>(
			`/users/${userId}/tweets`,
			{
				[maxResultsKey]: String(Math.min(Math.max(maxResults, 5), 100)),
				[tweetFieldsKey]: tweetFields,
				[userFieldsKey]: userFields,
				expansions,
			},
		);
	}

	async getUserFollowers(
		userId: string,
		maxResults = 10,
	): Promise<XApiResponse<XUser[]>> {
		return this.fetchWithBearer<XApiResponse<XUser[]>>(
			`/users/${userId}/followers`,
			{
				[maxResultsKey]: String(Math.min(Math.max(maxResults, 1), 1000)),
				[userFieldsKey]: userFields,
			},
		);
	}

	async getUserFollowing(
		userId: string,
		maxResults = 10,
	): Promise<XApiResponse<XUser[]>> {
		return this.fetchWithBearer<XApiResponse<XUser[]>>(
			`/users/${userId}/following`,
			{
				[maxResultsKey]: String(Math.min(Math.max(maxResults, 1), 1000)),
				[userFieldsKey]: userFields,
			},
		);
	}

	async getTweetMetrics(tweetId: string): Promise<XApiResponse<XTweet>> {
		return this.fetchWithBearer<XApiResponse<XTweet>>(`/tweets/${tweetId}`, {
			[tweetFieldsKey]: 'public_metrics,non_public_metrics,organic_metrics',
		});
	}

	async getMyUser(): Promise<XApiResponse<XUser>> {
		return this.fetchWithOauth<XApiResponse<XUser>>('GET', '/users/me');
	}

	async getMyMentions(maxResults = 10): Promise<XApiResponse<XTweet[]>> {
		const me = await this.getMyUser();
		return this.fetchWithBearer<XApiResponse<XTweet[]>>(
			`/users/${me.data.id}/mentions`,
			{
				[maxResultsKey]: String(Math.min(Math.max(maxResults, 5), 100)),
				[tweetFieldsKey]: tweetFields,
				[userFieldsKey]: userFields,
				expansions,
			},
		);
	}

	async getMyBookmarks(_maxResults = 10): Promise<XApiResponse<XTweet[]>> {
		const me = await this.getMyUser();
		return this.fetchWithOauth<XApiResponse<XTweet[]>>(
			'GET',
			`/users/${me.data.id}/bookmarks`,
		);
	}

	async postTweet(
		text: string,
	): Promise<XApiResponse<{id: string; text: string}>> {
		return this.fetchWithOauth<XApiResponse<{id: string; text: string}>>(
			'POST',
			'/tweets',
			{text},
		);
	}

	async replyToTweet(
		tweetId: string,
		text: string,
	): Promise<XApiResponse<{id: string; text: string}>> {
		return this.fetchWithOauth<XApiResponse<{id: string; text: string}>>(
			'POST',
			'/tweets',
			{text, reply: {[inReplyToTweetIdKey]: tweetId}},
		);
	}

	async quoteTweet(
		tweetId: string,
		text: string,
	): Promise<XApiResponse<{id: string; text: string}>> {
		return this.fetchWithOauth<XApiResponse<{id: string; text: string}>>(
			'POST',
			'/tweets',
			{text, [quoteTweetIdKey]: tweetId},
		);
	}

	async deleteTweet(
		tweetId: string,
	): Promise<XApiResponse<{deleted: boolean}>> {
		return this.fetchWithOauth<XApiResponse<{deleted: boolean}>>(
			'DELETE',
			`/tweets/${tweetId}`,
		);
	}

	async likeTweet(tweetId: string): Promise<XApiResponse<{liked: boolean}>> {
		const me = await this.getMyUser();
		return this.fetchWithOauth<XApiResponse<{liked: boolean}>>(
			'POST',
			`/users/${me.data.id}/likes`,
			{[tweetIdKey]: tweetId},
		);
	}

	async retweet(tweetId: string): Promise<XApiResponse<{retweeted: boolean}>> {
		const me = await this.getMyUser();
		return this.fetchWithOauth<XApiResponse<{retweeted: boolean}>>(
			'POST',
			`/users/${me.data.id}/retweets`,
			{[tweetIdKey]: tweetId},
		);
	}

	async bookmarkTweet(
		tweetId: string,
	): Promise<XApiResponse<{bookmarked: boolean}>> {
		const me = await this.getMyUser();
		return this.fetchWithOauth<XApiResponse<{bookmarked: boolean}>>(
			'POST',
			`/users/${me.data.id}/bookmarks`,
			{[tweetIdKey]: tweetId},
		);
	}

	async resolveUserId(username: string): Promise<string> {
		const response = await this.getUserByUsername(username);
		return response.data.id;
	}

	parseTweetId(input: string): string {
		const match = /(?:x\.com|twitter\.com)\/\w+\/status\/(\d+)/i.exec(input);
		return match ? match[1]! : input;
	}

	stripAt(username: string): string {
		return username.startsWith('@') ? username.slice(1) : username;
	}

	private async throttle(): Promise<void> {
		const now = Date.now();
		const elapsed = now - this.lastRequestTime;
		if (elapsed < this.rateLimit) {
			await new Promise(resolve => {
				setTimeout(resolve, this.rateLimit - elapsed);
			});
		}

		this.lastRequestTime = Date.now();
	}

	private createJsonHeaders(
		authorizationValue: string,
	): Record<string, string> {
		return {
			[authorizationHeader]: authorizationValue,
			[contentTypeHeader]: jsonContentType,
		};
	}

	private async fetchWithBearer<T>(
		endpoint: string,
		parameters: Record<string, string> = {},
	): Promise<T> {
		await this.throttle();
		const url = new URL(`${baseUrl}${endpoint}`);
		for (const [key, value] of Object.entries(parameters)) {
			url.searchParams.set(key, value);
		}

		const response = await fetch(url.toString(), {
			headers: this.createJsonHeaders(
				`Bearer ${this.credentialStore.getBearerToken()}`,
			),
		});

		if (!response.ok) {
			const body = await response.text();
			throw new Error(
				`X API error: ${response.status} ${response.statusText} - ${body}`,
			);
		}

		return response.json() as Promise<T>;
	}

	private async fetchWithOauth<T>(
		method: string,
		endpoint: string,
		body?: Record<string, unknown>,
	): Promise<T> {
		await this.throttle();
		const url = `${baseUrl}${endpoint}`;
		const credentials = this.credentialStore.getCredentials();
		const headers = this.createJsonHeaders(
			generateOAuthHeader(method, url, {}, credentials),
		);

		const response = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			const responseBody = await response.text();
			throw new Error(
				`X API error: ${response.status} ${response.statusText} - ${responseBody}`,
			);
		}

		return response.json() as Promise<T>;
	}
}

export {TwitterApiClient as XApi};
