import {type XhsCookieStore, XsecTokenCache} from '../auth/xhs-auth';
import type {
	XhsNote,
	XhsUser,
	XhsSearchResult,
	XhsFeedItem,
	XhsTopic,
	XhsComment,
} from './xhs-types';
import {XhsBrowser} from './xhs-browser';

const xhsWebUrl = 'https://www.xiaohongshu.com';

export class XhsApi {
	private browser: XhsBrowser | undefined;
	private readonly tokenCache = new XsecTokenCache();

	constructor(private readonly cookieStore: XhsCookieStore) {}

	async init(): Promise<void> {
		await this.cookieStore.load();
		await this.tokenCache.load();
	}

	// --- Note operations ---

	async getNote(noteId: string): Promise<XhsNote> {
		const browser = await this.ensureBrowser();
		const state = await browser.navigateAndExtract<Record<string, unknown>>(
			`${xhsWebUrl}/explore/${noteId}`,
		);

		return this.parseNoteFromState(state, noteId);
	}

	async getNoteWithComments(
		noteId: string,
	): Promise<{note: XhsNote; comments: XhsComment[]}> {
		const browser = await this.ensureBrowser();
		const state = await browser.navigateAndExtract<Record<string, unknown>>(
			`${xhsWebUrl}/explore/${noteId}`,
		);

		const note = this.parseNoteFromState(state, noteId);
		const comments = this.parseCommentsFromState(state);
		return {note, comments};
	}

	// --- Search & Discovery ---

	async searchNotes(query: string, limit = 20): Promise<XhsSearchResult[]> {
		const browser = await this.ensureBrowser();
		const state = await browser.navigateAndExtract<Record<string, unknown>>(
			`${xhsWebUrl}/search_result?keyword=${encodeURIComponent(
				query,
			)}&source=web_search_result_note`,
		);

		return this.parseSearchResults(state, limit);
	}

	async getFeed(limit = 20): Promise<XhsFeedItem[]> {
		const browser = await this.ensureBrowser();
		const state = await browser.navigateAndExtract<Record<string, unknown>>(
			`${xhsWebUrl}/explore`,
		);

		return this.parseFeedItems(state, limit);
	}

	async getTopics(query: string): Promise<XhsTopic[]> {
		const browser = await this.ensureBrowser();
		const state = await browser.navigateAndExtract<Record<string, unknown>>(
			`${xhsWebUrl}/search_result?keyword=${encodeURIComponent(
				query,
			)}&source=web_search_result_note&type=topic`,
		);

		return this.parseTopics(state);
	}

	// --- User operations ---

	async getUserProfile(userId: string): Promise<XhsUser> {
		const browser = await this.ensureBrowser();
		const state = await browser.navigateAndExtract<Record<string, unknown>>(
			`${xhsWebUrl}/user/profile/${userId}`,
		);

		return this.parseUserFromState(state, userId);
	}

	async getUserNotes(userId: string, limit = 20): Promise<XhsSearchResult[]> {
		const browser = await this.ensureBrowser();
		const state = await browser.navigateAndExtract<Record<string, unknown>>(
			`${xhsWebUrl}/user/profile/${userId}`,
		);

		return this.parseUserNotes(state, limit);
	}

	async getFollowers(userId: string): Promise<XhsUser[]> {
		const browser = await this.ensureBrowser();
		const state = await browser.navigateAndExtract<Record<string, unknown>>(
			`${xhsWebUrl}/user/profile/${userId}`,
		);

		return this.parseFollowList(state, 'followers');
	}

	async getFollowing(userId: string): Promise<XhsUser[]> {
		const browser = await this.ensureBrowser();
		const state = await browser.navigateAndExtract<Record<string, unknown>>(
			`${xhsWebUrl}/user/profile/${userId}`,
		);

		return this.parseFollowList(state, 'following');
	}

	// --- Engagement ---

	async likeNote(noteId: string): Promise<void> {
		const browser = await this.ensureBrowser();
		await browser.navigateAndExtract(`${xhsWebUrl}/explore/${noteId}`);
		try {
			await browser.performClick(
				'[class*="like-wrapper"] button, .like-btn, [data-type="like"]',
			);
		} catch {
			throw new Error('无法点赞，可能需要登录或页面结构已变更');
		}
	}

	async unlikeNote(noteId: string): Promise<void> {
		await this.likeNote(noteId); // Toggle
	}

	async favoriteNote(noteId: string): Promise<void> {
		const browser = await this.ensureBrowser();
		await browser.navigateAndExtract(`${xhsWebUrl}/explore/${noteId}`);
		try {
			await browser.performClick(
				'[class*="collect-wrapper"] button, .collect-btn, [data-type="collect"]',
			);
		} catch {
			throw new Error('无法收藏，可能需要登录或页面结构已变更');
		}
	}

	async unfavoriteNote(noteId: string): Promise<void> {
		await this.favoriteNote(noteId); // Toggle
	}

	async postComment(noteId: string, text: string): Promise<void> {
		const browser = await this.ensureBrowser();
		await browser.navigateAndExtract(`${xhsWebUrl}/explore/${noteId}`);
		try {
			await browser.fillInput(
				'[class*="comment-input"] textarea, .comment-input textarea',
				text,
			);
			await browser.performClick(
				'[class*="comment-submit"] button, .comment-submit, .submit-btn',
			);
		} catch {
			throw new Error('无法评论，可能需要登录或页面结构已变更');
		}
	}

	async deleteNote(noteId: string): Promise<void> {
		// This requires navigating to creator center
		const browser = await this.ensureBrowser();
		await browser.navigateAndExtract(`${xhsWebUrl}/explore/${noteId}`);
		try {
			await browser.performClick('[class*="more-btn"], .note-more-btn');
			await browser.performClick('[class*="delete"], .delete-btn');
			// Confirm deletion
			await browser.performClick('[class*="confirm"], .confirm-btn');
		} catch {
			throw new Error('无法删除笔记，可能需要登录或权限不足');
		}
	}

	// --- Publishing ---

	async publishImageNote(
		title: string,
		content: string,
		_imagePaths: string[],
	): Promise<{noteId: string}> {
		const browser = await this.ensureBrowser();
		// Navigate to creator publish page
		await browser.navigateAndExtract(
			'https://creator.xiaohongshu.com/publish/publish',
		);

		try {
			// Upload images - this requires file input interaction
			// Note: actual image upload needs Playwright file chooser API
			// This is a simplified flow

			// Fill title
			await browser.fillInput('[class*="title"] input, #title-input', title);

			// Fill content
			await browser.fillInput(
				'[class*="content"] textarea, #content-input',
				content,
			);

			// Submit
			await browser.performClick(
				'[class*="publish-btn"], .publish-btn, button[type="submit"]',
			);

			// Wait for redirect / confirmation
			await browser.waitForElement(
				'[class*="success"], .publish-success',
				30_000,
			);

			// Try to extract note ID from URL
			const currentUrl = browser.getCurrentUrl();
			const match = /explore\/([a-f\d]+)/i.exec(currentUrl);

			return {noteId: match?.[1] ?? 'unknown'};
		} catch {
			throw new Error('发布失败，可能需要登录到创作者中心');
		}
	}

	// --- Auth helpers ---

	async getMyProfile(): Promise<XhsUser> {
		const browser = await this.ensureBrowser();
		const state = await browser.navigateAndExtract<Record<string, unknown>>(
			`${xhsWebUrl}/user/profile/me`,
		);

		// Extract from user page state
		const userState = this.deepGet(state, 'user.userPageData') as
			| Record<string, unknown>
			| undefined;
		if (!userState) {
			throw new Error('无法获取个人信息，请确认已登录');
		}

		return {
			userId: String(userState.id ?? userState.userId ?? ''),
			nickname: String(userState.nickname ?? userState.name ?? ''),
			avatar: String(userState.imageb ?? userState.avatar ?? ''),
			description: String(userState.desc ?? ''),
			followerCount: Number(userState.fans ?? 0),
			followingCount: Number(userState.follows ?? 0),
			noteCount: Number(userState.notes ?? 0),
			likeCount: Number(userState.liked ?? 0),
			collectedCount: Number(userState.collected ?? 0),
		};
	}

	async getMyFavorites(): Promise<XhsSearchResult[]> {
		const browser = await this.ensureBrowser();
		const state = await browser.navigateAndExtract<Record<string, unknown>>(
			`${xhsWebUrl}/user/profile/me?tab=collect`,
		);

		return this.parseUserNotes(state, 50);
	}

	async close(): Promise<void> {
		if (this.browser) {
			await this.browser.close();
			this.browser = undefined;
		}

		await this.tokenCache.save();
	}

	// --- State parsing helpers ---

	private deepGet(object: unknown, path: string): unknown {
		const parts = path.split('.');
		let current: unknown = object;
		for (const part of parts) {
			if (
				current === null ||
				current === undefined ||
				typeof current !== 'object'
			) {
				return undefined;
			}

			current = (current as Record<string, unknown>)[part];
		}

		return current;
	}

	// The XHS page state is highly inconsistent across page versions, so this parser stays explicit.
	// eslint-disable-next-line complexity
	private parseNoteFromState(
		state: Record<string, unknown>,
		noteId: string,
	): XhsNote {
		// XHS stores note data in different paths depending on page version
		const noteState = (
			this.deepGet(state, 'note.noteDetailMap') as
				| Record<string, unknown>
				| undefined
		)?.[noteId] as Record<string, unknown> | undefined;

		const noteData = (noteState?.note ?? this.deepGet(state, 'note.note')) as
			| Record<string, unknown>
			| undefined;

		if (!noteData) {
			throw new Error(`笔记 ${noteId} 未找到或无法访问`);
		}

		const user = (noteData.user ?? {}) as Record<string, unknown>;
		const imageList = (noteData.imageList ?? noteData.images ?? []) as Array<
			Record<string, unknown>
		>;
		const tagList = (noteData.tagList ?? noteData.tags ?? []) as Array<
			Record<string, unknown>
		>;
		const interactInfo = (noteData.interactInfo ?? {}) as Record<
			string,
			unknown
		>;

		return {
			noteId: String(noteData.noteId ?? noteData.id ?? noteId),
			title: String(noteData.title ?? ''),
			description: String(noteData.desc ?? noteData.description ?? ''),
			type: String(noteData.type) === 'video' ? 'video' : 'normal',
			user: {
				userId: String(user.userId ?? user.id ?? ''),
				nickname: String(user.nickname ?? user.name ?? ''),
				avatar: String(user.avatar ?? user.imageb ?? ''),
			},
			imageList: imageList.map(img => ({
				url: String(img.urlDefault ?? img.url ?? img.urlPre ?? ''),
				width: Number(img.width ?? 0),
				height: Number(img.height ?? 0),
			})),
			videoUrl: noteData.video
				? String((noteData.video as Record<string, unknown>).url ?? '')
				: undefined,
			tags: tagList.map(tag => ({
				id: String(tag.id ?? ''),
				name: String(tag.name ?? ''),
				type: String(tag.type ?? ''),
			})),
			createTime: String(noteData.time ?? noteData.createTime ?? ''),
			likeCount: Number(interactInfo.likedCount ?? noteData.likeCount ?? 0),
			collectCount: Number(
				interactInfo.collectedCount ?? noteData.collectCount ?? 0,
			),
			commentCount: Number(
				interactInfo.commentCount ?? noteData.commentCount ?? 0,
			),
			shareCount: Number(interactInfo.shareCount ?? noteData.shareCount ?? 0),
		};
	}

	private parseCommentsFromState(state: Record<string, unknown>): XhsComment[] {
		const commentsData = (this.deepGet(state, 'note.comments') ??
			this.deepGet(state, 'comment.comments') ??
			[]) as Array<Record<string, unknown>>;

		return commentsData.map(c => {
			const user = (c.userInfo ?? c.user ?? {}) as Record<string, unknown>;
			return {
				id: String(c.id ?? ''),
				content: String(c.content ?? ''),
				userId: String(user.userId ?? user.id ?? ''),
				nickname: String(user.nickname ?? user.name ?? ''),
				avatar: String(user.image ?? user.avatar ?? ''),
				createTime: String(c.createTime ?? c.time ?? ''),
				likeCount: Number(c.likeCount ?? 0),
			};
		});
	}

	private parseSearchResults(
		state: Record<string, unknown>,
		limit: number,
	): XhsSearchResult[] {
		const items = (this.deepGet(state, 'search.feeds') ??
			this.deepGet(state, 'search.notes') ??
			[]) as Array<Record<string, unknown>>;

		return items.slice(0, limit).map(
			// eslint-disable-next-line complexity
			item => {
				const noteCard = (item.noteCard ?? item) as Record<string, unknown>;
				const user = (noteCard.user ?? {}) as Record<string, unknown>;
				const interactInfo = (noteCard.interactInfo ?? {}) as Record<
					string,
					unknown
				>;

				// Cache xsec_token if available
				const xsecToken = String(item.xsec_token ?? '');
				if (xsecToken) {
					const nid = String(noteCard.noteId ?? noteCard.id ?? '');
					if (nid) this.tokenCache.set(nid, xsecToken);
				}

				return {
					noteId: String(noteCard.noteId ?? noteCard.id ?? ''),
					title: String(noteCard.displayTitle ?? noteCard.title ?? ''),
					description: String(noteCard.desc ?? ''),
					user: {
						userId: String(user.userId ?? user.id ?? ''),
						nickname: String(user.nickname ?? user.name ?? ''),
						avatar: String(user.avatar ?? ''),
					},
					likeCount: Number(interactInfo.likedCount ?? 0),
					imageUrl: String(
						noteCard.cover
							? (noteCard.cover as Record<string, unknown>).urlDefault ?? ''
							: '',
					),
					xsecToken,
				};
			},
		);
	}

	private parseFeedItems(
		state: Record<string, unknown>,
		limit: number,
	): XhsFeedItem[] {
		const items = (this.deepGet(state, 'feed.feeds') ??
			this.deepGet(state, 'homefeed.feeds') ??
			[]) as Array<Record<string, unknown>>;

		return items.slice(0, limit).map(
			// eslint-disable-next-line complexity
			item => {
				const noteCard = (item.noteCard ?? item) as Record<string, unknown>;
				const user = (noteCard.user ?? {}) as Record<string, unknown>;
				const interactInfo = (noteCard.interactInfo ?? {}) as Record<
					string,
					unknown
				>;

				const xsecToken = String(item.xsec_token ?? '');
				if (xsecToken) {
					const nid = String(noteCard.noteId ?? noteCard.id ?? '');
					if (nid) this.tokenCache.set(nid, xsecToken);
				}

				return {
					noteId: String(noteCard.noteId ?? noteCard.id ?? ''),
					title: String(noteCard.displayTitle ?? noteCard.title ?? ''),
					description: String(noteCard.desc ?? ''),
					user: {
						userId: String(user.userId ?? user.id ?? ''),
						nickname: String(user.nickname ?? user.name ?? ''),
					},
					likeCount: Number(interactInfo.likedCount ?? 0),
					imageUrl: String(
						noteCard.cover
							? (noteCard.cover as Record<string, unknown>).urlDefault ?? ''
							: '',
					),
					xsecToken,
				};
			},
		);
	}

	private parseTopics(state: Record<string, unknown>): XhsTopic[] {
		const items = (this.deepGet(state, 'search.topics') ?? []) as Array<
			Record<string, unknown>
		>;

		return items.map(item => ({
			id: String(item.id ?? ''),
			name: String(item.name ?? ''),
			description: String(item.desc ?? ''),
			noteCount: Number(item.noteCount ?? 0),
			viewCount: Number(item.viewCount ?? 0),
		}));
	}

	private parseUserFromState(
		state: Record<string, unknown>,
		userId: string,
	): XhsUser {
		const userState = (this.deepGet(state, 'user.userPageData') ??
			this.deepGet(state, 'user.info')) as Record<string, unknown> | undefined;

		if (!userState) {
			throw new Error(`用户 ${userId} 未找到`);
		}

		return {
			userId: String(userState.id ?? userState.userId ?? userId),
			nickname: String(userState.nickname ?? userState.name ?? ''),
			avatar: String(userState.imageb ?? userState.avatar ?? ''),
			description: String(userState.desc ?? ''),
			gender: Number(userState.gender ?? 0),
			ipLocation: String(userState.ipLocation ?? ''),
			followerCount: Number(userState.fans ?? 0),
			followingCount: Number(userState.follows ?? 0),
			noteCount: Number(userState.notes ?? 0),
			likeCount: Number(userState.liked ?? 0),
			collectedCount: Number(userState.collected ?? 0),
		};
	}

	private parseUserNotes(
		state: Record<string, unknown>,
		limit: number,
	): XhsSearchResult[] {
		const items = (this.deepGet(state, 'user.notes') ??
			this.deepGet(state, 'user.noteList') ??
			[]) as Array<Record<string, unknown>>;

		return items.slice(0, limit).map(item => {
			const user = (item.user ?? {}) as Record<string, unknown>;
			const interactInfo = (item.interactInfo ?? {}) as Record<string, unknown>;
			return {
				noteId: String(item.noteId ?? item.id ?? ''),
				title: String(item.displayTitle ?? item.title ?? ''),
				description: String(item.desc ?? ''),
				user: {
					userId: String(user.userId ?? user.id ?? ''),
					nickname: String(user.nickname ?? user.name ?? ''),
				},
				likeCount: Number(interactInfo.likedCount ?? item.likeCount ?? 0),
				imageUrl: String(
					item.cover
						? (item.cover as Record<string, unknown>).urlDefault ?? ''
						: '',
				),
			};
		});
	}

	private parseFollowList(
		state: Record<string, unknown>,
		type: 'followers' | 'following',
	): XhsUser[] {
		const items = (this.deepGet(state, `user.${type}`) ?? []) as Array<
			Record<string, unknown>
		>;

		return items.map(item => ({
			userId: String(item.userId ?? item.id ?? ''),
			nickname: String(item.nickname ?? item.name ?? ''),
			avatar: String(item.imageb ?? item.avatar ?? ''),
			description: String(item.desc ?? ''),
			followerCount: Number(item.fans ?? 0),
		}));
	}

	private async ensureBrowser(): Promise<XhsBrowser> {
		if (!this.browser) {
			this.browser = new XhsBrowser();
			if (this.cookieStore.isAuthenticated()) {
				await this.browser.launchWithCookies(
					this.cookieStore.getCookieString(),
				);
			} else {
				await this.browser.launch();
			}
		}

		return this.browser;
	}
}
