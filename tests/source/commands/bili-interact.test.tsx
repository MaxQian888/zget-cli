import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import BiliInteractCommand from '../../../source/commands/bili-interact';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
	},
	api: {
		likeVideo: vi.fn(),
		coinVideo: vi.fn(),
		tripleVideo: vi.fn(),
	},
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/bili-auth', () => ({
	BiliCookieStore: class MockCookieStore {
		constructor() {
			return mocks.cookieStore;
		}
	},
}));

vi.mock('../../../source/core/api/bili-api', () => ({
	BiliApi: class MockBiliApi {
		constructor() {
			return mocks.api;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
	mocks.api.likeVideo.mockResolvedValue(undefined);
	mocks.api.coinVideo.mockResolvedValue(undefined);
	mocks.api.tripleVideo.mockResolvedValue(undefined);
});

describe('BiliInteractCommand', () => {
	it.each([
		{
			name: 'likes a video',
			props: {interactType: 'bili-like', target: 'BV1like'},
			expected: '已点赞视频 BV1like',
		},
		{
			name: 'coins a video',
			props: {interactType: 'bili-coin', target: 'BV1coin'},
			expected: '已投币视频 BV1coin',
		},
		{
			name: 'triples a video',
			props: {interactType: 'bili-triple', target: 'BV1triple'},
			expected: '已一键三连视频 BV1triple',
		},
	])('$name', async ({props, expected}) => {
		const view = render(<BiliInteractCommand {...props} flags={baseFlags} />);

		expect(view.lastFrame()).toContain('正在处理...');

		await flushAsync();

		expect(view.lastFrame()).toContain(expected);
	});

	it('renders raw json output when requested', async () => {
		const view = render(
			<BiliInteractCommand
				interactType="bili-like"
				target="BV1json"
				flags={baseFlags}
				format="json"
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"success": true');
		expect(frame).toContain('"action": "bili-like"');
		expect(frame).toContain('"target": "BV1json"');
	});

	it('surfaces unsupported interact types as errors', async () => {
		const view = render(
			<BiliInteractCommand
				interactType={'bili-unknown' as never}
				target="BV1bad"
				flags={baseFlags}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('Unsupported Bilibili interact type');
		expect(frame).toContain('运行 "zget bili login" 登录后重试');
	});
});
