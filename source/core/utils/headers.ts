const chromeVersion = '145';
const userAgentHeader = 'User-Agent';
const acceptHeader = 'Accept';
const acceptLanguageHeader = 'Accept-Language';
const refererHeader = 'Referer';
const originHeader = 'Origin';
const cookieHeader = 'Cookie';

export const defaultUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;

export function getBrowserHeaders(): Record<string, string> {
	return {
		[userAgentHeader]: defaultUserAgent,
		[acceptHeader]: 'application/json, text/plain, */*',
		[acceptLanguageHeader]: 'en-US,en;q=0.9',
		[refererHeader]: 'https://www.zhihu.com/',
		'sec-ch-ua': `"Not:A-Brand";v="99", "Google Chrome";v="${chromeVersion}", "Chromium";v="${chromeVersion}"`,
		'sec-ch-ua-mobile': '?0',
		'sec-ch-ua-platform': '"Windows"',
	};
}

export function getHtmlHeaders(): Record<string, string> {
	return {
		...getBrowserHeaders(),
		[acceptHeader]:
			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	};
}

export function getXhsHeaders(cookies?: string): Record<string, string> {
	const headers: Record<string, string> = {
		[userAgentHeader]: defaultUserAgent,
		[acceptHeader]: 'application/json, text/plain, */*',
		[acceptLanguageHeader]: 'zh-CN,zh;q=0.9,en;q=0.8',
		[originHeader]: 'https://www.xiaohongshu.com',
		[refererHeader]: 'https://www.xiaohongshu.com/',
		'sec-ch-ua': `"Not:A-Brand";v="99", "Google Chrome";v="${chromeVersion}", "Chromium";v="${chromeVersion}"`,
		'sec-ch-ua-mobile': '?0',
		'sec-ch-ua-platform': '"Windows"',
	};

	if (cookies) {
		headers[cookieHeader] = cookies;
	}

	return headers;
}

export function getBiliHeaders(cookies?: string): Record<string, string> {
	const headers: Record<string, string> = {
		[userAgentHeader]: defaultUserAgent,
		[acceptHeader]: 'application/json, text/plain, */*',
		[acceptLanguageHeader]: 'zh-CN,zh;q=0.9,en;q=0.8',
		[originHeader]: 'https://www.bilibili.com',
		[refererHeader]: 'https://www.bilibili.com/',
		'sec-ch-ua': `"Not:A-Brand";v="99", "Google Chrome";v="${chromeVersion}", "Chromium";v="${chromeVersion}"`,
		'sec-ch-ua-mobile': '?0',
		'sec-ch-ua-platform': '"Windows"',
	};

	if (cookies) {
		headers[cookieHeader] = cookies;
	}

	return headers;
}

export function getWeiboHeaders(
	cookies?: string,
	csrfToken?: string,
): Record<string, string> {
	const headers: Record<string, string> = {
		[userAgentHeader]: defaultUserAgent,
		[acceptHeader]: 'application/json, text/plain, */*',
		[acceptLanguageHeader]: 'zh-CN,zh;q=0.9,en;q=0.8',
		[refererHeader]: 'https://weibo.com/',
		'X-Requested-With': 'XMLHttpRequest',
		'client-version': 'v2.47.42',
		'sec-ch-ua': `"Not:A-Brand";v="99", "Google Chrome";v="${chromeVersion}", "Chromium";v="${chromeVersion}"`,
		'sec-ch-ua-mobile': '?0',
		'sec-ch-ua-platform': '"Windows"',
	};

	if (cookies) {
		headers[cookieHeader] = cookies;
	}

	if (csrfToken) {
		headers['X-XSRF-TOKEN'] = csrfToken;
	}

	return headers;
}
