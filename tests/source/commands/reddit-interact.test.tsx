import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import RedditInteractCommand from '../../../source/commands/reddit-interact';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	credStore: {
		load: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		upvote: vi.fn(),
		downvote: vi.fn(),
		unvote: vi.fn(),
		save: vi.fn(),
		unsave: vi.fn(),
		subscribe: vi.fn(),
		unsubscribe: vi.fn(),
		comment: vi.fn(),
		deleteThing: vi.fn(),
	},
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/reddit-auth', () => ({
	RedditCredentialStore: class {
		constructor() {
			return mocks.credStore;
		}
	},
}));

vi.mock('../../../source/core/api/reddit-api', () => ({
	RedditApi: class {
		constructor() {
			return mocks.api;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.credStore.load.mockResolvedValue(undefined);
	mocks.credStore.isAuthenticated.mockReturnValue(true);
	for (const fn of Object.values(mocks.api)) {
		fn.mockResolvedValue({success: true, action: 'x', target: 't3_a'});
	}
});

describe('RedditInteractCommand', () => {
	it.each([
		['reddit-upvote' as const, 'upvote'],
		['reddit-downvote' as const, 'downvote'],
		['reddit-unvote' as const, 'unvote'],
		['reddit-save' as const, 'save'],
		['reddit-unsave' as const, 'unsave'],
	])(
		'%s auto-prefixes bare IDs to t3_ and calls api.%s',
		async (interactType, method) => {
			render(
				<RedditInteractCommand
					interactType={interactType}
					target="abc"
					flags={baseFlags}
					format="json"
				/>,
			);
			await flushAsync();
			expect(
				(mocks.api as Record<string, ReturnType<typeof vi.fn>>)[method],
			).toHaveBeenCalledWith('t3_abc');
		},
	);

	it.each([
		['reddit-subscribe' as const, 'subscribe'],
		['reddit-unsubscribe' as const, 'unsubscribe'],
	])(
		'%s passes the subreddit name as-is to api.%s',
		async (interactType, method) => {
			render(
				<RedditInteractCommand
					interactType={interactType}
					target="programming"
					flags={baseFlags}
					format="json"
				/>,
			);
			await flushAsync();
			expect(
				(mocks.api as Record<string, ReturnType<typeof vi.fn>>)[method],
			).toHaveBeenCalledWith('programming');
		},
	);

	it('keeps explicit t1_/t3_ prefixes when provided', async () => {
		render(
			<RedditInteractCommand
				interactType="reddit-upvote"
				target="t1_abc"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.upvote).toHaveBeenCalledWith('t1_abc');
	});

	it('refuses comment without --text', async () => {
		const view = render(
			<RedditInteractCommand
				interactType="reddit-comment"
				target="t3_a"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(view.lastFrame()).toContain('--text');
	});

	it('comment with --text calls api.comment with the auto-prefixed ID', async () => {
		mocks.api.comment.mockResolvedValue({commentId: 'newC'});
		render(
			<RedditInteractCommand
				interactType="reddit-comment"
				target="abc"
				text="hi"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.comment).toHaveBeenCalledWith('t3_abc', 'hi');
	});

	it('refuses delete without --yes', async () => {
		const view = render(
			<RedditInteractCommand
				interactType="reddit-delete"
				target="abc"
				flags={baseFlags}
				isConfirmed={false}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(mocks.api.deleteThing).not.toHaveBeenCalled();
	});

	it('delete with --yes proceeds', async () => {
		const view = render(
			<RedditInteractCommand
				isConfirmed
				interactType="reddit-delete"
				target="abc"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.deleteThing).toHaveBeenCalledWith('t3_abc');
		expect(view.lastFrame()).toContain('"ok": true');
	});

	it('refuses to operate without a target', async () => {
		const view = render(
			<RedditInteractCommand
				interactType="reddit-upvote"
				target=""
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
	});

	it('NOPERM when not authenticated', async () => {
		mocks.credStore.isAuthenticated.mockReturnValue(false);
		const view = render(
			<RedditInteractCommand
				interactType="reddit-upvote"
				target="t3_a"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"code": 77');
	});
});
