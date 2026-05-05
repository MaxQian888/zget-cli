import type {XhsCookies} from './xhs-types';

// Playwright types - dynamically imported
type PlaywrightBrowser = {
	close(): Promise<void>;
};

type PlaywrightCookieInput = {
	name: string;
	value: string;
	domain?: string;
	path?: string;
	expires?: number;
	httpOnly?: boolean;
	secure?: boolean;
	sameSite?: 'Strict' | 'Lax' | 'None';
	url?: string;
};

type PlaywrightFileChooser = {
	setFiles(files: string | string[]): Promise<void>;
};

type PlaywrightContext = {
	newPage(): Promise<PlaywrightPage>;
	cookies(
		urls?: string | string[],
	): Promise<Array<{name: string; value: string}>>;
	addCookies(cookies: PlaywrightCookieInput[]): Promise<void>;
	close(): Promise<void>;
};

type PlaywrightPage = {
	goto(
		url: string,
		options?: {waitUntil?: string; timeout?: number},
	): Promise<unknown>;
	evaluate<T>(fn: () => T): Promise<T>;
	waitForTimeout(ms: number): Promise<void>;
	content(): Promise<string>;
	click(selector: string, options?: {timeout?: number}): Promise<void>;
	fill(selector: string, value: string): Promise<void>;
	waitForSelector(
		selector: string,
		options?: {timeout?: number; state?: string},
	): Promise<unknown>;
	waitForEvent(
		event: 'filechooser',
		options?: {timeout?: number},
	): Promise<PlaywrightFileChooser>;
	setInputFiles(selector: string, files: string | string[]): Promise<void>;
	// Mirrors Playwright's API name verbatim.
	// eslint-disable-next-line @typescript-eslint/naming-convention
	waitForURL(
		url: string | RegExp | ((url: string) => boolean),
		options?: {timeout?: number; waitUntil?: string},
	): Promise<unknown>;
	url(): string;
	close(): Promise<void>;
};

type PlaywrightModule = {
	chromium: {
		launch(options?: Record<string, unknown>): Promise<
			PlaywrightBrowser & {
				newContext(
					options?: Record<string, unknown>,
				): Promise<PlaywrightContext>;
			}
		>;
	};
};

const xhsCookieDomains = ['.xiaohongshu.com', '.creator.xiaohongshu.com'];

function parseCookieStringToPlaywright(
	cookieString: string,
): PlaywrightCookieInput[] {
	const result: PlaywrightCookieInput[] = [];
	for (const pair of cookieString.split(';')) {
		const [rawKey, ...rest] = pair.trim().split('=');
		if (!rawKey || rest.length === 0) continue;
		const name = rawKey.trim();
		const value = rest.join('=').trim();
		if (!name || !value) continue;
		// XHS cookies span the apex domain and the creator subdomain.
		for (const domain of xhsCookieDomains) {
			result.push({name, value, domain, path: '/'});
		}
	}

	return result;
}

export class XhsBrowser {
	private browser: PlaywrightBrowser | undefined;
	private context: PlaywrightContext | undefined;
	private page: PlaywrightPage | undefined;

	async launch(): Promise<void> {
		await this.bootstrap();
	}

	async launchWithCookies(cookieString: string): Promise<void> {
		await this.bootstrap(cookieString);
	}

	async navigateAndExtract<T = unknown>(url: string): Promise<T> {
		if (!this.page) throw new Error('Browser not launched');

		await this.page.goto(url, {
			waitUntil: 'networkidle' as string,
			timeout: 30_000,
		});
		// Wait for Vue.js to render
		await this.page.waitForTimeout(2000);

		// Extract __INITIAL_STATE__
		const state = await this.page.evaluate<Record<string, unknown> | undefined>(
			() => {
				const windowState = (
					window as unknown as {
						__INITIAL_STATE__?: Record<string, unknown>;
					}
				).__INITIAL_STATE__;
				if (!windowState) return undefined;

				// Deep clone to strip Vue reactive proxies
				try {
					return JSON.parse(JSON.stringify(windowState)) as Record<
						string,
						unknown
					>;
				} catch {
					return undefined;
				}
			},
		);

		if (!state) {
			throw new Error('Failed to extract page state from XHS page');
		}

		return state as unknown as T;
	}

	async getPageContent(url: string): Promise<string> {
		if (!this.page) throw new Error('Browser not launched');
		await this.page.goto(url, {
			waitUntil: 'networkidle' as string,
			timeout: 30_000,
		});
		await this.page.waitForTimeout(2000);
		return this.page.content();
	}

	async performClick(selector: string): Promise<void> {
		if (!this.page) throw new Error('Browser not launched');
		await this.page.click(selector, {timeout: 10_000});
		await this.page.waitForTimeout(1000);
	}

	async fillInput(selector: string, value: string): Promise<void> {
		if (!this.page) throw new Error('Browser not launched');
		await this.page.fill(selector, value);
	}

	async waitForElement(selector: string, timeout = 10_000): Promise<void> {
		if (!this.page) throw new Error('Browser not launched');
		await this.page.waitForSelector(selector, {timeout});
	}

	async waitForUrlMatch(
		matcher: RegExp | ((url: string) => boolean),
		timeout = 30_000,
	): Promise<void> {
		if (!this.page) throw new Error('Browser not launched');
		await this.page.waitForURL(matcher, {timeout});
	}

	async setInputFiles(
		selector: string,
		filePaths: string | string[],
	): Promise<void> {
		if (!this.page) throw new Error('Browser not launched');
		await this.page.setInputFiles(selector, filePaths);
	}

	// Click a trigger that opens a native file picker, then feed the picker the given files.
	async uploadFile(
		triggerSelector: string,
		filePaths: string | string[],
		timeout = 15_000,
	): Promise<void> {
		if (!this.page) throw new Error('Browser not launched');
		const fileChooserPromise = this.page.waitForEvent('filechooser', {timeout});
		await this.page.click(triggerSelector, {timeout});
		const chooser = await fileChooserPromise;
		await chooser.setFiles(filePaths);
	}

	async extractCookies(): Promise<XhsCookies> {
		if (!this.context) throw new Error('Browser not launched');
		const cookies = await this.context.cookies('https://www.xiaohongshu.com');
		const result: XhsCookies = {};
		for (const cookie of cookies) {
			result[cookie.name] = cookie.value;
		}

		return result;
	}

	getCurrentUrl(): string {
		if (!this.page) throw new Error('Browser not launched');
		return this.page.url();
	}

	getPage(): PlaywrightPage | undefined {
		return this.page;
	}

	getContext(): PlaywrightContext | undefined {
		return this.context;
	}

	async close(): Promise<void> {
		if (this.browser) {
			await this.browser.close();
			this.browser = undefined;
			this.context = undefined;
			this.page = undefined;
		}
	}

	private async bootstrap(cookieString?: string): Promise<void> {
		let playwright: PlaywrightModule;
		try {
			playwright = (await import('playwright')) as unknown as PlaywrightModule;
		} catch {
			throw new Error(
				'Playwright is required for XHS features. Install it with:\n' +
					'  pnpm add playwright\n' +
					'  npx playwright install chromium',
			);
		}

		const browser = await playwright.chromium.launch({
			headless: true,
			args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
		});

		this.browser = browser;
		this.context = await browser.newContext({
			userAgent:
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
			viewport: {width: 1920, height: 1080},
			locale: 'zh-CN',
		});

		if (cookieString) {
			const cookies = parseCookieStringToPlaywright(cookieString);
			if (cookies.length > 0) {
				await this.context.addCookies(cookies);
			}
		}

		this.page = await this.context.newPage();
	}
}
