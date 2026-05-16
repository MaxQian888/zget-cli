import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import HnBrowseCommand from '../../../source/commands/hn-browse';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		getList: vi.fn(),
		search: vi.fn(),
		searchByDate: vi.fn(),
		getItem: vi.fn(),
		getUser: vi.fn(),
		getComments: vi.fn(),
	},
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/hn-auth', () => ({
	HnCookieStore: class {
		constructor() {
			return mocks.cookieStore;
		}
	},
}));

vi.mock('../../../source/core/api/hn-api', () => ({
	HnApi: class {
		constructor() {
			return mocks.api;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
});

describe('HnBrowseCommand', () => {
	it.each([
		['hn-best', 'best'],
		['hn-new', 'new'],
		['hn-ask', 'ask'],
		['hn-show', 'show'],
		['hn-jobs', 'job'],
	])('routes %s to getList(%s, limit)', async (browseType, listKind) => {
		mocks.api.getList.mockResolvedValue([]);
		render(
			<HnBrowseCommand
				browseType={browseType as never}
				query=""
				flags={baseFlags}
				limit={3}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getList).toHaveBeenCalledWith(listKind, 3);
	});

	it('renders top stories as a numbered list', async () => {
		mocks.api.getList.mockResolvedValue([
			{id: 1, title: 'first', by: 'a', score: 10, descendants: 2},
			{id: 2, title: 'second', by: 'b', score: 5, descendants: 0},
		]);
		const view = render(
			<HnBrowseCommand
				browseType="hn-top"
				query=""
				flags={baseFlags}
				limit={2}
				format="human"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getList).toHaveBeenCalledWith('top', 2);
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('first');
		expect(frame).toContain('second');
	});

	it('search returns JSON envelope when format=json', async () => {
		mocks.api.search.mockResolvedValue({
			hits: [{objectID: '1', title: 't', author: 'a', points: 5}],
			nbHits: 1,
			page: 0,
			nbPages: 1,
			hitsPerPage: 1,
		});
		const view = render(
			<HnBrowseCommand
				browseType="hn-search"
				query="rust"
				flags={baseFlags}
				limit={5}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.search).toHaveBeenCalledWith(
			'rust',
			expect.objectContaining({hitsPerPage: 5}),
		);
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"ok": true');
		expect(frame).toContain('"objectID": "1"');
	});

	it('hn-item without an ID surfaces an error', async () => {
		const view = render(
			<HnBrowseCommand
				browseType="hn-item"
				query=""
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"ok": false');
		expect(frame).toContain('需要一个 ID 参数');
	});

	it('hn-item renders item fields in human mode', async () => {
		mocks.api.getItem.mockResolvedValue({
			id: 7,
			title: 'A title',
			by: 'pg',
			score: 42,
			descendants: 5,
			url: 'https://example.com',
			text: '<p>some body</p>',
		});
		const view = render(
			<HnBrowseCommand
				browseType="hn-item"
				query="7"
				flags={baseFlags}
				limit={1}
				format="human"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getItem).toHaveBeenCalledWith('7');
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('A title');
		expect(frame).toContain('pg');
	});

	it('hn-user-submitted batches submitted IDs through getItem', async () => {
		mocks.api.getUser.mockResolvedValue({
			id: 'pg',
			karma: 1,
			created: 0,
			submitted: [11, 12, 13],
		});
		mocks.api.getItem.mockResolvedValue({id: 11, title: 'sub'});
		const view = render(
			<HnBrowseCommand
				browseType="hn-user-submitted"
				query="pg"
				flags={baseFlags}
				limit={2}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getUser).toHaveBeenCalledWith('pg');
		// Only first 2 of 3 submitted IDs should be fetched.
		expect(mocks.api.getItem).toHaveBeenCalledTimes(2);
		expect(view.lastFrame()).toContain('"ok": true');
	});

	it('hn-comments walks the kid tree via getComments', async () => {
		mocks.api.getComments.mockResolvedValue([
			{id: 100, parent: 99, by: 'a', text: '<p>x</p>'},
		]);
		const view = render(
			<HnBrowseCommand
				browseType="hn-comments"
				query="99"
				flags={baseFlags}
				limit={5}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getComments).toHaveBeenCalledWith('99', {
			maxDepth: 3,
			perLevel: 5,
		});
		expect(view.lastFrame()).toContain('"ok": true');
	});

	it('search uses searchByDate when --date is present in extraArgs', async () => {
		mocks.api.searchByDate.mockResolvedValue({
			hits: [],
			nbHits: 0,
			page: 0,
			nbPages: 0,
			hitsPerPage: 30,
		});
		render(
			<HnBrowseCommand
				browseType="hn-search"
				query="x"
				flags={baseFlags}
				limit={1}
				format="json"
				extraArgs={['--date']}
			/>,
		);
		await flushAsync();
		expect(mocks.api.searchByDate).toHaveBeenCalled();
	});

	it('surfaces a human-readable error when the API throws', async () => {
		mocks.api.getList.mockRejectedValue(new Error('boom'));
		const view = render(
			<HnBrowseCommand
				browseType="hn-top"
				query=""
				flags={baseFlags}
				limit={1}
				format="human"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('boom');
	});

	it('hn-user calls getUser', async () => {
		mocks.api.getUser.mockResolvedValue({
			id: 'pg',
			karma: 1,
			created: 0,
			submitted: [],
		});
		const view = render(
			<HnBrowseCommand
				browseType="hn-user"
				query="pg"
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.api.getUser).toHaveBeenCalledWith('pg');
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"id": "pg"');
	});

	it('top-stories list falls back when title/by/score/descendants are missing', async () => {
		mocks.api.getList.mockResolvedValue([
			{id: 88, title: undefined, by: undefined},
		]);
		const view = render(
			<HnBrowseCommand
				browseType="hn-top"
				query=""
				flags={baseFlags}
				limit={1}
				format="human"
			/>,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('(no title)');
		expect(frame).toContain('#88');
	});

	it('search falls back on hit fields and uses story_text/comment_text when title is missing', async () => {
		mocks.api.search.mockResolvedValue({
			hits: [
				{objectID: 'a', story_text: '<p>story</p>'},
				{objectID: 'b', comment_text: 'a comment'},
				{objectID: 'c'},
			],
			nbHits: 3,
			page: 0,
			nbPages: 1,
			hitsPerPage: 3,
		});
		const view = render(
			<HnBrowseCommand
				browseType="hn-search"
				query="x"
				flags={baseFlags}
				limit={3}
				format="human"
			/>,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('story');
		expect(frame).toContain('comment');
	});

	it('search forwards a tags= extraArg', async () => {
		mocks.api.search.mockResolvedValue({
			hits: [],
			nbHits: 0,
			page: 0,
			nbPages: 0,
			hitsPerPage: 1,
		});
		render(
			<HnBrowseCommand
				browseType="hn-search"
				query="x"
				flags={baseFlags}
				limit={1}
				format="json"
				extraArgs={['tags=story']}
			/>,
		);
		await flushAsync();
		expect(mocks.api.search).toHaveBeenCalledWith(
			'x',
			expect.objectContaining({tags: 'story'}),
		);
	});

	it.each([
		['hn-user', '用户名参数'],
		['hn-user-submitted', '用户名参数'],
		['hn-comments', 'item ID 参数'],
	])('%s without a query surfaces a usage error', async browseType => {
		const view = render(
			<HnBrowseCommand
				browseType={browseType as never}
				query=""
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('"ok": false');
	});

	it('hn-item skips optional fields when they are missing', async () => {
		mocks.api.getItem.mockResolvedValue({
			id: 7,
			title: undefined,
			by: undefined,
		});
		const view = render(
			<HnBrowseCommand
				browseType="hn-item"
				query="7"
				flags={baseFlags}
				limit={1}
				format="human"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame() ?? '').toContain('#7');
	});

	it('hn-user-submitted shows comment fallback when an item lacks a title', async () => {
		mocks.api.getUser.mockResolvedValue({
			id: 'pg',
			karma: 1,
			created: 0,
			submitted: [11],
		});
		mocks.api.getItem.mockResolvedValue({id: 11, text: 'just a comment'});
		const view = render(
			<HnBrowseCommand
				browseType="hn-user-submitted"
				query="pg"
				flags={baseFlags}
				limit={1}
				format="human"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame() ?? '').toContain('just a comment');
	});

	it('hn-user shows the about field when present', async () => {
		mocks.api.getUser.mockResolvedValue({
			id: 'pg',
			karma: 5,
			created: 0,
			submitted: [],
			about: '<p>about body</p>',
		});
		const view = render(
			<HnBrowseCommand
				browseType="hn-user"
				query="pg"
				flags={baseFlags}
				limit={1}
				format="human"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame() ?? '').toContain('about body');
	});

	it('hn-comments falls back on missing author/text', async () => {
		mocks.api.getComments.mockResolvedValue([
			{id: 100, parent: 99, by: undefined, text: undefined},
		]);
		const view = render(
			<HnBrowseCommand
				browseType="hn-comments"
				query="99"
				flags={baseFlags}
				limit={1}
				format="human"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame() ?? '').toContain('#100');
	});

	it('applies --cookies flag override', async () => {
		mocks.api.getList.mockResolvedValue([]);
		render(
			<HnBrowseCommand
				browseType="hn-top"
				query=""
				flags={{...baseFlags, cookies: 'user=alice'}}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'user=alice',
		);
	});

	it('rejects an unknown browse type', async () => {
		const view = render(
			<HnBrowseCommand
				browseType={'hn-unknown' as never}
				query=""
				flags={baseFlags}
				limit={1}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('Unsupported');
	});
});
