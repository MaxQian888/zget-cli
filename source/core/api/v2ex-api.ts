import type {
	V2exApiV2Envelope,
	V2exInteractResult,
	V2exMember,
	V2exNode,
	V2exNotification,
	V2exPublishResult,
	V2exReply,
	V2exTopic,
} from '../../types/v2ex';
import {type V2exTokenStore} from '../auth/v2ex-auth';
import {getV2exHeaders} from '../utils/headers';
import {CliError, ExitCode} from '../utils/exit-codes';

const v2Base = 'https://www.v2ex.com/api/v2';
const v1Base = 'https://www.v2ex.com/api';
const siteBase = 'https://www.v2ex.com';

export class V2exApi {
	private lastRequestTime = 0;

	constructor(private readonly tokenStore?: V2exTokenStore) {}

	// --- Read (v2, Bearer required) ---

	async getMyMember(): Promise<V2exMember> {
		const data = await this.getV2<V2exMember>('/member', {requireAuth: true});
		return data;
	}

	async getNotifications(
		options: {page?: number} = {},
	): Promise<V2exNotification[]> {
		const query = options.page ? `?p=${String(options.page)}` : '';
		const data = await this.getV2<V2exNotification[]>(
			`/notifications${query}`,
			{requireAuth: true},
		);
		return data;
	}

	async getMyTopics(options: {page?: number} = {}): Promise<V2exTopic[]> {
		// V2EX v2 doesn't have a dedicated my-topics endpoint; fall back to
		// /api/v2/topics with the auth header, which returns the user's recent.
		const query = options.page ? `?p=${String(options.page)}` : '';
		const data = await this.getV2<V2exTopic[]>(`/topics${query}`, {
			requireAuth: true,
		});
		return data;
	}

	async getMyFollowing(): Promise<V2exTopic[]> {
		const data = await this.getV2<V2exTopic[]>('/topics?type=following', {
			requireAuth: true,
		});
		return data;
	}

	// --- Read (v1, public) ---

	async getHot(): Promise<V2exTopic[]> {
		return this.getV1Array<V2exTopic>('/topics/hot.json');
	}

	async getLatest(): Promise<V2exTopic[]> {
		return this.getV1Array<V2exTopic>('/topics/latest.json');
	}

	async getTopic(topicId: number | string): Promise<V2exTopic> {
		const items = await this.getV1Array<V2exTopic>(
			`/topics/show.json?id=${String(topicId)}`,
		);
		const topic = items[0];
		if (!topic) {
			throw new CliError(
				`未找到 V2EX 主题: ${String(topicId)}`,
				ExitCode.DATA_ERR,
			);
		}

		return topic;
	}

	async getReplies(
		topicId: number | string,
		options: {page?: number} = {},
	): Promise<V2exReply[]> {
		const query = `?topic_id=${String(topicId)}${
			options.page ? `&page=${String(options.page)}` : ''
		}`;
		return this.getV1Array<V2exReply>(`/replies/show.json${query}`);
	}

	async getNode(nodeName: string): Promise<V2exNode> {
		const items = await this.getV1Array<V2exNode>(
			`/nodes/show.json?name=${encodeURIComponent(nodeName)}`,
		);
		const node = items[0];
		if (!node) {
			throw new CliError(`未找到 V2EX 节点: ${nodeName}`, ExitCode.DATA_ERR);
		}

		return node;
	}

	async getNodeTopics(
		nodeName: string,
		options: {page?: number} = {},
	): Promise<V2exTopic[]> {
		const query = `?node_name=${encodeURIComponent(nodeName)}${
			options.page ? `&page=${String(options.page)}` : ''
		}`;
		return this.getV1Array<V2exTopic>(`/topics/show.json${query}`);
	}

	async getMember(username: string): Promise<V2exMember> {
		const items = await this.getV1Array<V2exMember>(
			`/members/show.json?username=${encodeURIComponent(username)}`,
		);
		const member = items[0];
		if (!member) {
			throw new CliError(`未找到 V2EX 用户: ${username}`, ExitCode.DATA_ERR);
		}

		return member;
	}

	// --- Write (v2, Bearer required) ---

	async collect(topicId: number | string): Promise<V2exInteractResult> {
		await this.postV2(`/topics/${String(topicId)}/collect`);
		return {success: true, action: 'collect', target: String(topicId)};
	}

	async uncollect(topicId: number | string): Promise<V2exInteractResult> {
		await this.deleteV2(`/topics/${String(topicId)}/collect`);
		return {success: true, action: 'uncollect', target: String(topicId)};
	}

	async thankTopic(topicId: number | string): Promise<V2exInteractResult> {
		await this.postV2(`/topics/${String(topicId)}/thank`);
		return {success: true, action: 'thank-topic', target: String(topicId)};
	}

	async thankReply(replyId: number | string): Promise<V2exInteractResult> {
		await this.postV2(`/replies/${String(replyId)}/thank`);
		return {success: true, action: 'thank-reply', target: String(replyId)};
	}

	async reply(
		topicId: number | string,
		text: string,
	): Promise<V2exInteractResult> {
		if (!text.trim()) {
			throw new CliError('Reply text is empty', ExitCode.USAGE);
		}

		await this.postV2(`/topics/${String(topicId)}/replies`, {content: text});
		return {success: true, action: 'reply', target: String(topicId)};
	}

	async deleteReply(replyId: number | string): Promise<V2exInteractResult> {
		await this.deleteV2(`/replies/${String(replyId)}`);
		return {success: true, action: 'delete-reply', target: String(replyId)};
	}

	async newTopic(
		nodeName: string,
		title: string,
		content: string,
	): Promise<V2exPublishResult> {
		if (!nodeName) {
			throw new CliError('newTopic requires a node name', ExitCode.USAGE);
		}

		if (!title.trim()) {
			throw new CliError('newTopic requires --text <title>', ExitCode.USAGE);
		}

		if (!content.trim()) {
			throw new CliError('newTopic requires --content <body>', ExitCode.USAGE);
		}

		const result = await this.postV2<{id: number}>(
			`/nodes/${encodeURIComponent(nodeName)}/topics`,
			{title, content},
		);
		const topicId = result?.id ?? 0;
		return {
			topicId,
			url: topicId > 0 ? `${siteBase}/t/${String(topicId)}` : siteBase,
		};
	}

	// --- Internal helpers ---

	private async getV2<T>(
		path: string,
		options: {requireAuth?: boolean} = {},
	): Promise<T> {
		const token = options.requireAuth
			? this.requireToken()
			: this.optionalToken();
		await this.throttle();

		const resp = await fetch(`${v2Base}${path}`, {
			headers: getV2exHeaders(token),
		});
		return this.unwrapV2<T>(resp);
	}

	private async postV2<T = unknown>(
		path: string,
		body?: Record<string, unknown>,
	): Promise<T | undefined> {
		const token = this.requireToken();
		await this.throttle();

		const resp = await fetch(`${v2Base}${path}`, {
			method: 'POST',
			headers: {
				...getV2exHeaders(token),
				'Content-Type': 'application/json',
			},
			body: body ? JSON.stringify(body) : undefined,
		});
		return this.unwrapV2<T>(resp);
	}

	private async deleteV2(path: string): Promise<void> {
		const token = this.requireToken();
		await this.throttle();

		const resp = await fetch(`${v2Base}${path}`, {
			method: 'DELETE',
			headers: getV2exHeaders(token),
		});
		await this.unwrapV2<unknown>(resp);
	}

	private async getV1Array<T>(path: string): Promise<T[]> {
		await this.throttle();

		const resp = await fetch(`${v1Base}${path}`, {
			headers: getV2exHeaders(),
		});

		if (!resp.ok) {
			throw new CliError(
				`V2EX v1 error: ${resp.status} ${resp.statusText}`,
				resp.status >= 500 ? ExitCode.TEMPFAIL : ExitCode.PROTOCOL,
			);
		}

		const data = (await resp.json()) as T[];
		return Array.isArray(data) ? data : [];
	}

	private async unwrapV2<T>(resp: Response): Promise<T> {
		if (!resp.ok) {
			throw new CliError(
				`V2EX v2 error: ${resp.status} ${resp.statusText}`,
				resp.status === 401 || resp.status === 403
					? ExitCode.NOPERM
					: resp.status >= 500
					? ExitCode.TEMPFAIL
					: ExitCode.PROTOCOL,
			);
		}

		const text = await resp.text();
		if (!text) return undefined as T;

		const json = JSON.parse(text) as V2exApiV2Envelope<T>;
		if (!json.success) {
			throw new CliError(
				`V2EX v2 error: ${json.message ?? 'unknown'}`,
				ExitCode.PROTOCOL,
			);
		}

		return json.result as T;
	}

	private async throttle(): Promise<void> {
		const now = Date.now();
		const elapsed = now - this.lastRequestTime;
		const minGap = 400;
		if (elapsed < minGap) {
			await new Promise<void>(resolve => {
				setTimeout(resolve, minGap - elapsed);
			});
		}

		this.lastRequestTime = Date.now();
	}

	private requireToken(): string {
		const token = this.tokenStore?.getToken();
		if (!token) {
			throw new CliError(
				'未登录，请先运行 "zget v2ex login"',
				ExitCode.NOPERM,
				'zget v2ex login',
			);
		}

		return token;
	}

	private optionalToken(): string | undefined {
		return this.tokenStore?.getToken();
	}
}
