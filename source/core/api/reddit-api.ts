// Reddit's HTTP API uses snake_case form params (api_type, thing_id, sr_name…).
// Mirroring those exactly is the simplest way to keep the wire format correct.
/* eslint-disable @typescript-eslint/naming-convention */

import type {
	RedditComment,
	RedditInteractResult,
	RedditListing,
	RedditPost,
	RedditPublishResult,
	RedditSubreddit,
	RedditThing,
	RedditUser,
} from '../../types/reddit';
import {
	refreshRedditAccessToken,
	type RedditCredentialStore,
} from '../auth/reddit-auth';
import {getRedditHeaders} from '../utils/headers';
import {CliError, ExitCode} from '../utils/exit-codes';

const oauthBase = 'https://oauth.reddit.com';
const publicBase = 'https://www.reddit.com';

export class RedditApi {
	private lastRequestTime = 0;

	constructor(private readonly credStore?: RedditCredentialStore) {}

	// --- Read: self ---

	async getMyProfile(): Promise<RedditUser> {
		const data = await this.getOauth<RedditUser>('/api/v1/me');
		return data;
	}

	// --- Read: search ---

	async search(
		query: string,
		options: {subreddit?: string; sort?: string; limit?: number} = {},
	): Promise<RedditPost[]> {
		const parameters = new URLSearchParams({q: query});
		if (options.sort) parameters.set('sort', options.sort);
		parameters.set('limit', String(options.limit ?? 25));
		const path = options.subreddit
			? `/r/${
					options.subreddit
			  }/search.json?restrict_sr=1&${parameters.toString()}`
			: `/search.json?${parameters.toString()}`;
		return this.listingToPosts(
			await this.getJson<RedditListing<RedditPost>>(path),
		);
	}

	// --- Read: listings ---

	async getHot(subreddit?: string, limit = 25): Promise<RedditPost[]> {
		return this.listingPath('hot', subreddit, limit);
	}

	async getTop(subreddit?: string, limit = 25): Promise<RedditPost[]> {
		return this.listingPath('top', subreddit, limit);
	}

	async getNew(subreddit?: string, limit = 25): Promise<RedditPost[]> {
		return this.listingPath('new', subreddit, limit);
	}

	async getSubreddit(name: string): Promise<RedditSubreddit> {
		const thing = await this.getJson<RedditThing<RedditSubreddit>>(
			`/r/${name}/about.json`,
		);
		return thing.data;
	}

	// --- Read: single post + comments ---

	async getPost(postId: string, subreddit?: string): Promise<RedditPost> {
		const path = subreddit
			? `/r/${subreddit}/comments/${postId}.json`
			: `/comments/${postId}.json`;
		const data = await this.getJson<unknown>(path);
		if (!Array.isArray(data) || data.length === 0) {
			throw new CliError(`Reddit post not found: ${postId}`, ExitCode.DATA_ERR);
		}

		const listing = data[0] as RedditListing<RedditPost>;
		const post = listing.data.children[0]?.data;
		if (!post) {
			throw new CliError(`Reddit post not found: ${postId}`, ExitCode.DATA_ERR);
		}

		return post;
	}

	async getComments(
		postId: string,
		options: {limit?: number; subreddit?: string} = {},
	): Promise<RedditComment[]> {
		const path = options.subreddit
			? `/r/${options.subreddit}/comments/${postId}.json?limit=${String(
					options.limit ?? 100,
			  )}`
			: `/comments/${postId}.json?limit=${String(options.limit ?? 100)}`;
		const data = await this.getJson<unknown>(path);
		if (!Array.isArray(data) || data.length < 2) return [];
		const listing = data[1] as RedditListing<RedditComment>;
		return collectComments(listing);
	}

	// --- Read: users ---

	async getUser(username: string): Promise<RedditUser> {
		const thing = await this.getJson<RedditThing<RedditUser>>(
			`/user/${username}/about.json`,
		);
		return thing.data;
	}

	async getUserPosts(username: string, limit = 25): Promise<RedditPost[]> {
		return this.listingToPosts(
			await this.getJson<RedditListing<RedditPost>>(
				`/user/${username}/submitted.json?limit=${String(limit)}`,
			),
		);
	}

	async getUserComments(
		username: string,
		limit = 25,
	): Promise<RedditComment[]> {
		const listing = await this.getJson<RedditListing<RedditComment>>(
			`/user/${username}/comments.json?limit=${String(limit)}`,
		);
		return listing.data.children.map(c => c.data);
	}

	async getSaved(limit = 25): Promise<Array<RedditPost | RedditComment>> {
		this.requireAuth();
		const username = this.credStore?.getUsername() ?? 'me';
		const listing = await this.getOauth<
			RedditListing<RedditPost | RedditComment>
		>(`/user/${username}/saved?limit=${String(limit)}`);
		return listing.data.children.map(c => c.data);
	}

	async getSubscribed(limit = 100): Promise<RedditSubreddit[]> {
		this.requireAuth();
		const listing = await this.getOauth<RedditListing<RedditSubreddit>>(
			`/subreddits/mine/subscriber?limit=${String(limit)}`,
		);
		return listing.data.children.map(c => c.data);
	}

	// --- Write: voting, save, subscribe, comment, submit, delete ---

	async upvote(fullname: string): Promise<RedditInteractResult> {
		await this.postForm('/api/vote', {id: fullname, dir: '1'});
		return {success: true, action: 'upvote', target: fullname};
	}

	async downvote(fullname: string): Promise<RedditInteractResult> {
		await this.postForm('/api/vote', {id: fullname, dir: '-1'});
		return {success: true, action: 'downvote', target: fullname};
	}

	async unvote(fullname: string): Promise<RedditInteractResult> {
		await this.postForm('/api/vote', {id: fullname, dir: '0'});
		return {success: true, action: 'unvote', target: fullname};
	}

	async save(fullname: string): Promise<RedditInteractResult> {
		await this.postForm('/api/save', {id: fullname});
		return {success: true, action: 'save', target: fullname};
	}

	async unsave(fullname: string): Promise<RedditInteractResult> {
		await this.postForm('/api/unsave', {id: fullname});
		return {success: true, action: 'unsave', target: fullname};
	}

	async subscribe(subreddit: string): Promise<RedditInteractResult> {
		await this.postForm('/api/subscribe', {action: 'sub', sr_name: subreddit});
		return {success: true, action: 'subscribe', target: subreddit};
	}

	async unsubscribe(subreddit: string): Promise<RedditInteractResult> {
		await this.postForm('/api/subscribe', {
			action: 'unsub',
			sr_name: subreddit,
		});
		return {success: true, action: 'unsubscribe', target: subreddit};
	}

	async comment(fullname: string, text: string): Promise<RedditPublishResult> {
		if (!text.trim()) {
			throw new CliError('Comment text is empty', ExitCode.USAGE);
		}

		const response = await this.postForm<{
			json?: {data?: {things?: Array<RedditThing<RedditComment>>}};
		}>('/api/comment', {api_type: 'json', thing_id: fullname, text});
		const created = response.json?.data?.things?.[0]?.data;
		return {commentId: created?.id, url: undefined};
	}

	async deleteThing(fullname: string): Promise<RedditInteractResult> {
		await this.postForm('/api/del', {id: fullname});
		return {success: true, action: 'delete', target: fullname};
	}

	async submit(input: {
		subreddit: string;
		title: string;
		url?: string;
		text?: string;
	}): Promise<RedditPublishResult> {
		if (!input.subreddit) {
			throw new CliError('submit requires a subreddit', ExitCode.USAGE);
		}

		if (!input.title.trim()) {
			throw new CliError('submit requires --text <title>', ExitCode.USAGE);
		}

		const kind = input.url ? 'link' : 'self';
		const body: Record<string, string> = {
			api_type: 'json',
			sr: input.subreddit,
			kind,
			title: input.title,
		};
		if (input.url) body.url = input.url;
		if (input.text) body.text = input.text;

		const response = await this.postForm<{
			json?: {data?: {id?: string; url?: string; name?: string}};
		}>('/api/submit', body);
		const data = response.json?.data;
		return {postId: data?.id, url: data?.url};
	}

	// --- Internal helpers ---

	private async listingPath(
		kind: 'hot' | 'top' | 'new',
		subreddit?: string,
		limit = 25,
	): Promise<RedditPost[]> {
		const base = subreddit ? `/r/${subreddit}` : '';
		return this.listingToPosts(
			await this.getJson<RedditListing<RedditPost>>(
				`${base}/${kind}.json?limit=${String(limit)}`,
			),
		);
	}

	private listingToPosts(listing: RedditListing<RedditPost>): RedditPost[] {
		return listing.data.children.map(c => c.data);
	}

	// Anonymous JSON fetch via www.reddit.com (no auth needed).
	private async getJson<T>(path: string): Promise<T> {
		await this.throttle();

		const resp = await fetch(`${publicBase}${path}`, {
			headers: getRedditHeaders(),
		});

		if (!resp.ok) {
			throw new CliError(
				`Reddit error: ${resp.status} ${resp.statusText}`,
				resp.status === 429
					? ExitCode.TEMPFAIL
					: resp.status >= 500
					? ExitCode.TEMPFAIL
					: resp.status === 404
					? ExitCode.DATA_ERR
					: ExitCode.PROTOCOL,
			);
		}

		return (await resp.json()) as T;
	}

	// OAuth-required GET via oauth.reddit.com.
	private async getOauth<T>(path: string): Promise<T> {
		await this.maybeRefresh();
		await this.throttle();

		const token = this.requireAuth();
		const resp = await fetch(`${oauthBase}${path}`, {
			headers: getRedditHeaders(token),
		});

		if (resp.status === 401) {
			// One-shot refresh + retry.
			await refreshRedditAccessToken(this.credStore!).catch(() => undefined);
			const retryToken = this.credStore?.getAccessToken();
			if (!retryToken) {
				throw new CliError(
					'Reddit auth expired and refresh failed.',
					ExitCode.NOPERM,
					'zget reddit login',
				);
			}

			const retry = await fetch(`${oauthBase}${path}`, {
				headers: getRedditHeaders(retryToken),
			});
			if (!retry.ok) {
				throw new CliError(
					`Reddit OAuth retry failed: ${retry.status}`,
					ExitCode.NOPERM,
				);
			}

			return (await retry.json()) as T;
		}

		if (!resp.ok) {
			throw new CliError(
				`Reddit OAuth error: ${resp.status} ${resp.statusText}`,
				resp.status === 429 ? ExitCode.TEMPFAIL : ExitCode.PROTOCOL,
			);
		}

		return (await resp.json()) as T;
	}

	private async postForm<T = unknown>(
		path: string,
		body: Record<string, string>,
	): Promise<T> {
		await this.maybeRefresh();
		await this.throttle();

		const token = this.requireAuth();
		const resp = await fetch(`${oauthBase}${path}`, {
			method: 'POST',
			headers: {
				...getRedditHeaders(token),
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams(body).toString(),
		});

		if (!resp.ok) {
			throw new CliError(
				`Reddit write failed: ${resp.status} ${resp.statusText}`,
				resp.status === 401 || resp.status === 403
					? ExitCode.NOPERM
					: ExitCode.PROTOCOL,
			);
		}

		const text = await resp.text();
		if (!text) return undefined as T;
		try {
			return JSON.parse(text) as T;
		} catch {
			return undefined as T;
		}
	}

	private async maybeRefresh(): Promise<void> {
		if (!this.credStore) return;
		if (!this.credStore.hasAppCredentials()) return;
		if (!this.credStore.isAccessTokenExpired()) return;
		try {
			await refreshRedditAccessToken(this.credStore);
		} catch {
			// Leave the old token; the request will surface NOPERM if it really fails.
		}
	}

	private requireAuth(): string {
		const token = this.credStore?.getAccessToken();
		if (!token) {
			throw new CliError(
				'未登录，请先运行 "zget reddit login"',
				ExitCode.NOPERM,
				'zget reddit login',
			);
		}

		return token;
	}

	private async throttle(): Promise<void> {
		const now = Date.now();
		const elapsed = now - this.lastRequestTime;
		const minGap = 1100; // Reddit guideline: 1 req/sec for scripts
		if (elapsed < minGap) {
			await new Promise<void>(resolve => {
				setTimeout(resolve, minGap - elapsed);
			});
		}

		this.lastRequestTime = Date.now();
	}
}

function collectComments(
	listing: RedditListing<RedditComment>,
): RedditComment[] {
	const out: RedditComment[] = [];
	const walk = (l: RedditListing<RedditComment>): void => {
		for (const child of l.data.children) {
			if (child.kind !== 't1') continue;
			out.push(child.data);
			const nested = child.data.replies;
			if (typeof nested === 'object' && nested !== null) {
				walk(nested);
			}
		}
	};

	walk(listing);
	return out;
}
