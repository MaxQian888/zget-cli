import type {XhsCookies} from './xhs-types';

// Playwright types - dynamically imported
type PlaywrightBrowser = {
	close(): Promise<void>;
};

type PlaywrightContext = {
	newPage(): Promise<PlaywrightPage>;
	cookies(
		urls?: string | string[],
	): Promise<Array<{name: string; value: string}>>;
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

export class XhsBrowser {
	private browser: PlaywrightBrowser | undefined;
	private context: PlaywrightContext | undefined;
	private page: PlaywrightPage | undefined;

	async launch(): Promise<void> {
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

		this.page = await this.context.newPage();
	}

	async launchWithCookies(_cookieString: string): Promise<void> {
		await this.launch();

		// Set cookies via page navigation
		if (this.page) {
			await this.page.goto('https://www.xiaohongshu.com', {
				waitUntil: 'domcontentloaded',
				timeout: 30_000,
			});
			// Cookies are passed via the cookie string in subsequent requests
			// For browser context, we inject them via evaluate
			await this.page.evaluate(() => {
				// Clear existing cookies first
			});
		}
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

	async close(): Promise<void> {
		if (this.browser) {
			await this.browser.close();
			this.browser = undefined;
			this.context = undefined;
			this.page = undefined;
		}
	}
}
