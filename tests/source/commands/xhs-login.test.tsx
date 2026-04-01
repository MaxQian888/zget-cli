import {render} from 'ink-testing-library';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import XhsLoginCommand from '../../../source/commands/xhs-login';
import {baseFlags, flushAsync, setupCommandTestHarness} from './test-helpers';

const mocks = vi.hoisted(() => ({
	exit: vi.fn(),
	cookieStore: {
		load: vi.fn(),
		parseCookieString: vi.fn(),
		save: vi.fn(),
		isAuthenticated: vi.fn(),
		setCookies: vi.fn(),
		getCookieString: vi.fn(),
		clear: vi.fn(),
	},
	api: {
		init: vi.fn(),
		close: vi.fn(),
		getMyProfile: vi.fn(),
		getMyFavorites: vi.fn(),
	},
	browser: {
		launch: vi.fn(),
		getPageContent: vi.fn(),
		extractCookies: vi.fn(),
		close: vi.fn(),
	},
}));

vi.mock('../../../source/core/utils/ink-app', () => ({
	useInkApp: () => ({exit: mocks.exit}),
}));

vi.mock('../../../source/core/auth/xhs-auth', () => ({
	XhsCookieStore: class MockCookieStore {
		constructor() {
			return mocks.cookieStore;
		}
	},
}));

vi.mock('../../../source/core/api/xhs-api', () => ({
	XhsApi: class MockXhsApi {
		constructor() {
			return mocks.api;
		}
	},
}));

vi.mock('../../../source/core/api/xhs-browser', () => ({
	XhsBrowser: class MockXhsBrowser {
		constructor() {
			return mocks.browser;
		}
	},
}));

setupCommandTestHarness();

beforeEach(() => {
	mocks.cookieStore.load.mockResolvedValue(undefined);
	mocks.cookieStore.save.mockResolvedValue(undefined);
	mocks.cookieStore.isAuthenticated.mockReturnValue(true);
	mocks.cookieStore.getCookieString.mockReturnValue(
		'a1=token; web_session=session',
	);
	mocks.api.init.mockResolvedValue(undefined);
	mocks.api.close.mockResolvedValue(undefined);
	mocks.api.getMyProfile.mockResolvedValue({
		nickname: 'OpenAI',
		userId: 'user-1',
		noteCount: 3,
		followerCount: 10,
		followingCount: 4,
		likeCount: 20,
	});
	mocks.api.getMyFavorites.mockResolvedValue([
		{
			title: '收藏笔记',
			description: '收藏描述',
			noteId: 'fav-1',
			user: {nickname: '作者 A'},
		},
	]);
	mocks.browser.launch.mockResolvedValue(undefined);
	mocks.browser.getPageContent.mockResolvedValue('<html />');
	mocks.browser.extractCookies.mockResolvedValue({
		a1: 'token',
		web_session: 'session',
	});
	mocks.browser.close.mockResolvedValue(undefined);
});

describe('XhsLoginCommand', () => {
	it('saves manual cookies immediately when provided', async () => {
		const view = render(
			<XhsLoginCommand
				mode="xhs-login"
				flags={{...baseFlags, cookies: 'a1=token; web_session=session'}}
			/>,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ Cookie 已保存');
		expect(mocks.cookieStore.parseCookieString).toHaveBeenCalledWith(
			'a1=token; web_session=session',
		);
		expect(mocks.cookieStore.save).toHaveBeenCalled();
	});

	it('completes the browser-assisted login flow when cookies can be extracted', async () => {
		const view = render(<XhsLoginCommand mode="xhs-login" flags={baseFlags} />);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ 登录成功！Cookie 已保存');
		expect(mocks.browser.launch).toHaveBeenCalled();
		expect(mocks.cookieStore.setCookies).toHaveBeenCalledWith({
			a1: 'token',
			web_session: 'session',
		});
		expect(mocks.browser.close).toHaveBeenCalled();
	});

	it('shows a manual-cookie recovery error when browser login cannot extract cookies', async () => {
		mocks.browser.extractCookies.mockResolvedValue({});

		const view = render(<XhsLoginCommand mode="xhs-login" flags={baseFlags} />);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('无法自动获取 Cookie');
		expect(frame).toContain('xhs login --cookies');
		expect(mocks.browser.close).toHaveBeenCalled();
	});

	it('renders raw json output for whoami mode', async () => {
		const view = render(
			<XhsLoginCommand mode="xhs-whoami" flags={baseFlags} format="json" />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"nickname": "OpenAI"');
		expect(frame).toContain('"userId": "user-1"');
		expect(mocks.api.close).toHaveBeenCalled();
	});

	it('renders human profile details for whoami mode', async () => {
		const view = render(
			<XhsLoginCommand mode="xhs-whoami" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ 当前登录用户');
		expect(frame).toContain('昵称:');
		expect(frame).toContain('OpenAI');
		expect(frame).toContain('笔记:');
		expect(mocks.api.close).toHaveBeenCalled();
	});

	it('lists favorite notes in human mode', async () => {
		const view = render(
			<XhsLoginCommand mode="xhs-favorites" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ 我的收藏');
		expect(frame).toContain('收藏笔记  @作者 A');
		expect(mocks.api.close).toHaveBeenCalled();
	});

	it('renders raw json output for favorites mode', async () => {
		const view = render(
			<XhsLoginCommand mode="xhs-favorites" flags={baseFlags} format="json" />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('"title": "收藏笔记"');
		expect(frame).toContain('"nickname": "作者 A"');
		expect(mocks.api.close).toHaveBeenCalled();
	});

	it('clears stored cookies on logout', async () => {
		const view = render(
			<XhsLoginCommand mode="xhs-logout" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('✓ 已退出登录，Cookie 已清除');
		expect(mocks.cookieStore.clear).toHaveBeenCalled();
		expect(mocks.cookieStore.save).toHaveBeenCalled();
	});

	it('shows an auth error when favorites are requested without a login session', async () => {
		mocks.cookieStore.isAuthenticated.mockReturnValue(false);

		const view = render(
			<XhsLoginCommand mode="xhs-favorites" flags={baseFlags} />,
		);

		await flushAsync();

		const frame = view.lastFrame() ?? '';
		expect(frame).toContain('未登录，请先运行 "zget xhs login"');
		expect(frame).toContain('确保已安装 Playwright');
	});

	it('surfaces unsupported xhs login modes as errors', async () => {
		const view = render(
			<XhsLoginCommand mode={'xhs-unknown' as never} flags={baseFlags} />,
		);

		await flushAsync();

		expect(view.lastFrame()).toContain('Unsupported Xiaohongshu login mode');
	});
});
