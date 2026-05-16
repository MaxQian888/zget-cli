import {
	chromium,
	type Browser,
	type BrowserContext,
	type Page,
} from 'playwright';
import {HnCookieStore} from '../auth/hn-auth';

// Drives a real Chromium instance against news.ycombinator.com to capture the
// `user` cookie after a successful login. HN has no auth API, so this is the
// only way to support write actions (vote, comment, submit, fave).

type LoginCallbacks = {
	onReady?: (loginUrl: string) => void | Promise<void>;
	onStatusChange?: (
		status: 'waiting' | 'captured' | 'timeout' | 'error',
		message?: string,
	) => void;
};

const loginUrl = 'https://news.ycombinator.com/login?goto=news';
const defaultTimeoutMs = 120_000;

export async function performHnBrowserLogin(
	callbacks: LoginCallbacks = {},
	options: {headless?: boolean; timeoutMs?: number} = {},
): Promise<HnCookieStore> {
	const headless = options.headless ?? false;
	const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;

	let browser: Browser | undefined;
	let context: BrowserContext | undefined;
	let page: Page | undefined;

	try {
		browser = await chromium.launch({headless});
		context = await browser.newContext();
		page = await context.newPage();
		await page.goto(loginUrl, {waitUntil: 'domcontentloaded'});

		await callbacks.onReady?.(loginUrl);
		callbacks.onStatusChange?.('waiting');

		const deadline = Date.now() + timeoutMs;
		// Sequential polling on a real browser session — the cookie can only
		// arrive after waitForTimeout settles, so awaiting in the loop is intentional.
		/* eslint-disable no-await-in-loop */
		while (Date.now() < deadline) {
			const cookies = await context.cookies('https://news.ycombinator.com');
			const userCookie = cookies.find(c => c.name === 'user');
			if (userCookie?.value) {
				const store = new HnCookieStore();
				store.setCookies({user: userCookie.value});
				await store.save();
				callbacks.onStatusChange?.('captured');
				return store;
			}

			await page.waitForTimeout(1500);
		}
		/* eslint-enable no-await-in-loop */

		callbacks.onStatusChange?.('timeout');
		throw new Error('Hacker News 登录超时，请重新运行 "zget hn login"');
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		callbacks.onStatusChange?.('error', message);
		throw error;
	} finally {
		await page?.close().catch(() => undefined);
		await context?.close().catch(() => undefined);
		await browser?.close().catch(() => undefined);
	}
}
