import {homedir} from 'node:os';
import {join} from 'node:path';
import {mkdir} from 'node:fs/promises';

export const configDir = join(homedir(), '.zget-cli');
export const cookieFile = join(configDir, 'cookies.json');
export const downloadsStateDir = join(configDir, 'downloads');
export const qrCodeImagePath = join(configDir, 'login_qrcode.png');

// X (Twitter)
export const xCredentialsFile = join(configDir, 'x-credentials.json');

// XHS (Xiaohongshu)
export const xhsCookieFile = join(configDir, 'xhs-cookies.json');
export const xhsTokenFile = join(configDir, 'xhs-tokens.json');

// Bilibili
export const biliCookieFile = join(configDir, 'bili-cookies.json');

// Weibo (微博)
export const weiboCookieFile = join(configDir, 'weibo-cookies.json');

// Reddit
export const redditCredentialsFile = join(configDir, 'reddit-credentials.json');

// Hacker News
export const hnCookieFile = join(configDir, 'hn-cookies.json');

// V2EX
export const v2exTokenFile = join(configDir, 'v2ex-token.json');

// Douban (豆瓣)
export const doubanCookieFile = join(configDir, 'douban-cookies.json');

// Bluesky
export const bskySessionFile = join(configDir, 'bsky-session.json');

// AI
export const aiConfigFile = join(configDir, 'ai-config.json');

export const defaultOutputDir = './zhihu-downloads';

export async function ensureConfigDir(): Promise<void> {
	await mkdir(configDir, {recursive: true});
	await mkdir(downloadsStateDir, {recursive: true});
}
