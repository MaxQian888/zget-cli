import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import V2exBrowseCommand from '../../../source/commands/v2ex-browse';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	tokenStore: {
		load: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		getHot: vi.fn(),
		getLatest: vi.fn(),
		getNode: vi.fn(),
		getNodeTopics: vi.fn(),
		getTopic: vi.fn(),
		getReplies: vi.fn(),
		getMember: vi.fn(),
		getNotifications: vi.fn(),
		getMyTopics: vi.fn(),
		getMyFollowing: vi.fn(),
	},
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/v2ex-auth', () => ({
	V2exTokenStore: class {
		constructor() {
			return mocks.tokenStore;
		}
	},
}));

vi.mock('../../../source/core/api/v2ex-api', () => ({
	V2exApi: class {
		constructor() {
			return mocks.api;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.tokenStore.load.mockResolvedValue(undefined);
});

describe('V2exBrowseCommand', () => {
	it('hot lists topics with replies and author', async () => {
		mocks.api.getHot.mockResolvedValue([
			{id: 1, title: 'a', replies: 3, member: {username: 'al'}},
			{id: 2, title: 'b', replies: 0, member: {username: 'bo'}},
		]);
		const view = render(
			<V2exBrowseCommand
				browseType="v2ex-hot"
				query=""
				flags={baseFlags}
				limit={5}
				format="human"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getHot).toHaveBeenCalled();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('a');
		expect(frame).toContain('b');
	});

	it('latest returns JSON envelope when format=json', async () => {
		mocks.api.getLatest.mockResolvedValue([{id: 1, title: 't', replies: 0}]);
		const view = render(
			<V2exBrowseCommand
				browseType="v2ex-latest"
				query=""
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getLatest).toHaveBeenCalled();
		expect(view.lastFrame()).toContain('"ok": true');
	});

	it('node requires an argument', async () => {
		const view = render(
			<V2exBrowseCommand
				browseType="v2ex-node"
				query=""
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
		expect(view.lastFrame()).toContain('节点名');
	});

	it('topics calls getNodeTopics with the node name', async () => {
		mocks.api.getNodeTopics.mockResolvedValue([
			{id: 1, title: 'x', replies: 0},
		]);
		render(
			<V2exBrowseCommand
				browseType="v2ex-topics"
				query="go"
				flags={baseFlags}
				limit={3}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getNodeTopics).toHaveBeenCalledWith('go');
	});

	it('topic calls getTopic', async () => {
		mocks.api.getTopic.mockResolvedValue({
			id: 7,
			title: 'T',
			replies: 0,
			created: 0,
		});
		render(
			<V2exBrowseCommand
				browseType="v2ex-topic"
				query="7"
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getTopic).toHaveBeenCalledWith('7');
	});

	it('replies calls getReplies', async () => {
		mocks.api.getReplies.mockResolvedValue([
			{id: 1, content: 'x', created: 0, member: {username: 'alice'}},
		]);
		render(
			<V2exBrowseCommand
				browseType="v2ex-replies"
				query="7"
				flags={baseFlags}
				limit={5}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getReplies).toHaveBeenCalledWith('7');
	});

	it('member calls getMember', async () => {
		mocks.api.getMember.mockResolvedValue({id: 1, username: 'alice'});
		render(
			<V2exBrowseCommand
				browseType="v2ex-member"
				query="alice"
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getMember).toHaveBeenCalledWith('alice');
	});

	it('notifications/my-topics/my-following call their respective endpoints', async () => {
		mocks.api.getNotifications.mockResolvedValue([]);
		mocks.api.getMyTopics.mockResolvedValue([]);
		mocks.api.getMyFollowing.mockResolvedValue([]);
		render(
			<V2exBrowseCommand
				browseType="v2ex-notifications"
				query=""
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getNotifications).toHaveBeenCalled();
		render(
			<V2exBrowseCommand
				browseType="v2ex-my-topics"
				query=""
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getMyTopics).toHaveBeenCalled();
		render(
			<V2exBrowseCommand
				browseType="v2ex-my-following"
				query=""
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getMyFollowing).toHaveBeenCalled();
	});

	it('surfaces a human-readable error when the API throws', async () => {
		mocks.api.getHot.mockRejectedValue(new Error('boom'));
		const view = render(
			<V2exBrowseCommand
				browseType="v2ex-hot"
				query=""
				flags={baseFlags}
				limit={1}
				format="human"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('boom');
	});
});
