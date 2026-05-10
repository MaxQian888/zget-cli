import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import ZhihuPublishCommand from '../../../source/commands/zhihu-publish';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		askQuestion: vi.fn(),
		createPin: vi.fn(),
		publishArticle: vi.fn(),
	},
	uploadZhihuImage: vi.fn(),
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/cookie-store', () => ({
	CookieStore: class MockCookieStore {
		constructor() {
			return mocks.cookieStore;
		}
	},
}));

vi.mock('../../../source/core/api/client', () => ({
	ApiClient: class MockApiClient {},
}));

vi.mock('../../../source/core/api/zhihu-api', () => ({
	ZhihuApi: class MockZhihuApi {
		constructor() {
			return mocks.api;
		}
	},
}));

vi.mock('../../../source/core/api/zhihu-image-upload', () => ({
	uploadZhihuImage: (...args: unknown[]) => mocks.uploadZhihuImage(...args),
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(true);
	mocks.cookieStore.isAuthenticated.mockReturnValue(true);
	mocks.api.askQuestion.mockResolvedValue({
		id: 'q-1',
		type: 'question',
		url: 'https://www.zhihu.com/question/q-1',
	});
	mocks.api.createPin.mockResolvedValue({
		id: 'p-1',
		type: 'pin',
		url: 'https://www.zhihu.com/pin/p-1',
	});
	mocks.api.publishArticle.mockResolvedValue({
		id: 'a-1',
		type: 'article',
		url: 'https://zhuanlan.zhihu.com/p/a-1',
	});
	mocks.uploadZhihuImage.mockResolvedValue({
		imageId: 'img-1',
		src: 'https://pic1.zhimg.com/img-1_r.jpg',
		originalSrc: 'https://pic1.zhimg.com/img-1_r.jpg',
		width: 100,
		height: 100,
	});
});

describe('ZhihuPublishCommand', () => {
	it('asks a question without images', async () => {
		const view = render(
			<ZhihuPublishCommand
				kind="zhihu-ask"
				title="测试题目"
				body="正文"
				topics={['t1']}
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.api.askQuestion).toHaveBeenCalledWith(
			'测试题目',
			'正文',
			['t1'],
			[],
		);
		expect(mocks.uploadZhihuImage).not.toHaveBeenCalled();
		expect(view.lastFrame()).toContain('q-1');
	});

	it('uploads images before publishing a pin', async () => {
		render(
			<ZhihuPublishCommand
				kind="zhihu-pin"
				title="想法"
				body="正文"
				images={['./a.png', './b.png']}
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.uploadZhihuImage).toHaveBeenCalledTimes(2);
		expect(mocks.api.createPin).toHaveBeenCalledWith(
			'想法',
			'正文',
			expect.arrayContaining([expect.objectContaining({imageId: 'img-1'})]),
		);
	});

	it('publishes article and emits envelope JSON', async () => {
		const view = render(
			<ZhihuPublishCommand
				kind="zhihu-publish-article"
				title="文章"
				body="<p>正文</p>"
				topics={['x']}
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		const parsed = JSON.parse(view.lastFrame() ?? '') as {
			ok: boolean;
			data: {id: string; type: string};
		};
		expect(parsed.ok).toBe(true);
		expect(parsed.data.type).toBe('article');
		expect(parsed.data.id).toBe('a-1');
	});

	it('reports auth failure as envelope error', async () => {
		mocks.cookieStore.isAuthenticated.mockReturnValue(false);
		const view = render(
			<ZhihuPublishCommand
				kind="zhihu-pin"
				title="x"
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		const parsed = JSON.parse(view.lastFrame() ?? '') as {
			ok: boolean;
			error: {code: number};
		};
		expect(parsed.ok).toBe(false);
		expect(parsed.error.code).toBe(77);
	});
});
