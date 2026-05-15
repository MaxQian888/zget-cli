import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import WeiboPublishCommand from '../../../source/commands/weibo-publish';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
		isAuthenticated: vi.fn(),
	},
	api: {
		publishStatus: vi.fn(),
	},
	uploadWeiboImage: vi.fn(),
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/weibo-auth', () => ({
	WeiboCookieStore: class {
		constructor() {
			return mocks.cookieStore;
		}
	},
}));

vi.mock('../../../source/core/api/weibo-api', () => ({
	WeiboApi: class {
		constructor() {
			return mocks.api;
		}
	},
}));

vi.mock('../../../source/core/api/weibo-image-upload', () => ({
	uploadWeiboImage: mocks.uploadWeiboImage,
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
	mocks.cookieStore.isAuthenticated.mockReturnValue(true);
	mocks.api.publishStatus.mockResolvedValue({
		mid: 'NEW1',
		idstr: 'NEWIDSTR',
		mblogid: 'PnewMblog',
		url: 'https://weibo.com/1/PnewMblog',
	});
	mocks.uploadWeiboImage.mockResolvedValue('pic-id');
});

describe('WeiboPublishCommand', () => {
	it('publishes a text-only status', async () => {
		const view = render(<WeiboPublishCommand text="hello" flags={baseFlags} />);
		await flushAsync();
		expect(view.lastFrame()).toContain('微博已发布');
		expect(mocks.api.publishStatus).toHaveBeenCalledWith('hello', []);
	});

	it('uploads images then publishes', async () => {
		const view = render(
			<WeiboPublishCommand
				text="with image"
				images={['./a.jpg', './b.jpg']}
				flags={baseFlags}
			/>,
		);
		await flushAsync();
		expect(mocks.uploadWeiboImage).toHaveBeenCalledTimes(2);
		expect(mocks.api.publishStatus).toHaveBeenCalledWith('with image', [
			'pic-id',
			'pic-id',
		]);
		expect(view.lastFrame()).toContain('微博已发布');
	});

	it('rejects empty text', async () => {
		const view = render(
			<WeiboPublishCommand text="" flags={baseFlags} format="json" />,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"ok": false');
		expect(frame).toContain('正文不能为空');
	});

	it('rejects > 9 images', async () => {
		const tenImages = Array.from({length: 10}, (_, i) => `./${i}.jpg`);
		const view = render(
			<WeiboPublishCommand
				text="t"
				images={tenImages}
				flags={baseFlags}
				format="json"
			/>,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('最多支持 9 张图片');
	});

	it('errors when not authenticated', async () => {
		mocks.cookieStore.isAuthenticated.mockReturnValue(false);
		const view = render(<WeiboPublishCommand text="t" flags={baseFlags} />);
		await flushAsync();
		expect(view.lastFrame()).toContain('未登录');
	});

	it('emits json envelope on success', async () => {
		const view = render(
			<WeiboPublishCommand text="hi" flags={baseFlags} format="json" />,
		);
		await flushAsync();
		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"ok": true');
		expect(frame).toContain('"mid": "NEW1"');
	});

	it('emits failure envelope when api rejects', async () => {
		mocks.api.publishStatus.mockRejectedValue(new Error('rate limit'));
		const view = render(
			<WeiboPublishCommand text="hi" flags={baseFlags} format="json" />,
		);
		await flushAsync();
		expect(view.lastFrame()).toContain('rate limit');
	});
});
