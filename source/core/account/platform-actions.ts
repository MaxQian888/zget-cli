import process from 'node:process';
import {rm} from 'node:fs/promises';
import {CookieStore} from '../auth/cookie-store';
import {XhsCookieStore} from '../auth/xhs-auth';
import {BiliCookieStore} from '../auth/bili-auth';
import {WeiboCookieStore} from '../auth/weibo-auth';
import {
	aiConfigFile,
	bskySessionFile,
	doubanCookieFile,
	hnCookieFile,
	redditCredentialsFile,
	v2exTokenFile,
	xCredentialsFile,
	xhsTokenFile,
} from '../utils/config';
import {getPlatformAccountState} from './account-status';
import type {
	AccountAction,
	AccountActionResult,
	AccountPlatform,
} from './types';

function assertNever(value: never): never {
	throw new Error(`Unsupported value: ${String(value)}`);
}

function hasTwitterEnvCredentials(): boolean {
	return Boolean(
		process.env.X_API_KEY &&
			process.env.X_API_SECRET &&
			process.env.X_BEARER_TOKEN &&
			process.env.X_ACCESS_TOKEN &&
			process.env.X_ACCESS_TOKEN_SECRET,
	);
}

function hasAiEnvCredentials(): boolean {
	return Boolean(
		process.env.OPENAI_API_KEY ??
			process.env.ANTHROPIC_API_KEY ??
			process.env.DEEPSEEK_API_KEY ??
			process.env.AI_API_KEY,
	);
}

function getLoginCommand(platform: AccountPlatform): string {
	switch (platform) {
		case 'zhihu': {
			return 'zget login';
		}

		case 'x': {
			return 'zget x login';
		}

		case 'xhs': {
			return 'zget xhs login';
		}

		case 'bili': {
			return 'zget bili login';
		}

		case 'weibo': {
			return 'zget weibo login';
		}

		case 'reddit': {
			return 'zget reddit login';
		}

		case 'hn': {
			return 'zget hn login';
		}

		case 'v2ex': {
			return 'zget v2ex login';
		}

		case 'douban': {
			return 'zget douban login';
		}

		case 'bsky': {
			return 'zget bsky login';
		}

		case 'ai': {
			return 'Configure ~/.zget-cli/ai-config.json or set AI_* environment variables';
		}

		default: {
			return assertNever(platform);
		}
	}
}

async function refresh(
	platform: AccountPlatform,
	action: AccountAction,
	message: string,
): Promise<AccountActionResult> {
	return {
		ok: true,
		action,
		message,
		state: await getPlatformAccountState(platform),
	};
}

async function clearZhihu(): Promise<void> {
	const store = new CookieStore();
	await store.load();
	store.clear();
	await store.save();
}

async function clearXhs(): Promise<void> {
	const store = new XhsCookieStore();
	await store.load();
	store.clear();
	await store.save();
	await rm(xhsTokenFile, {force: true});
}

async function clearBili(): Promise<void> {
	const store = new BiliCookieStore();
	await store.load();
	store.clear();
	await store.save();
}

async function clearWeibo(): Promise<void> {
	const store = new WeiboCookieStore();
	await store.load();
	store.clear();
	await store.save();
}

export async function runPlatformAction(
	platform: AccountPlatform,
	action: AccountAction,
): Promise<AccountActionResult> {
	if (action === 'login') {
		return {
			ok: true,
			action,
			message: `Run ${getLoginCommand(platform)}`,
			nextCommand: getLoginCommand(platform),
		};
	}

	if (action === 'recheck') {
		return refresh(platform, action, `Rechecked ${platform} account state.`);
	}

	switch (platform) {
		case 'zhihu': {
			await clearZhihu();
			return refresh(platform, action, 'Cleared saved Zhihu cookies.');
		}

		case 'x': {
			if (hasTwitterEnvCredentials()) {
				return {
					ok: false,
					action,
					message: 'X credentials are coming from environment variables.',
				};
			}

			await rm(xCredentialsFile, {force: true});
			return refresh(platform, action, 'Cleared saved X credentials.');
		}

		case 'xhs': {
			await clearXhs();
			return refresh(platform, action, 'Cleared saved XHS cookies.');
		}

		case 'bili': {
			await clearBili();
			return refresh(platform, action, 'Cleared saved Bilibili cookies.');
		}

		case 'weibo': {
			await clearWeibo();
			return refresh(platform, action, 'Cleared saved Weibo cookies.');
		}

		case 'reddit': {
			await rm(redditCredentialsFile, {force: true});
			return refresh(platform, action, 'Cleared saved Reddit credentials.');
		}

		case 'hn': {
			await rm(hnCookieFile, {force: true});
			return refresh(platform, action, 'Cleared saved Hacker News cookies.');
		}

		case 'v2ex': {
			await rm(v2exTokenFile, {force: true});
			return refresh(platform, action, 'Cleared saved V2EX token.');
		}

		case 'douban': {
			await rm(doubanCookieFile, {force: true});
			return refresh(platform, action, 'Cleared saved Douban cookies.');
		}

		case 'bsky': {
			await rm(bskySessionFile, {force: true});
			return refresh(platform, action, 'Cleared saved Bluesky session.');
		}

		case 'ai': {
			if (hasAiEnvCredentials()) {
				return {
					ok: false,
					action,
					message: 'AI credentials are coming from environment variables.',
				};
			}

			await rm(aiConfigFile, {force: true});
			return refresh(platform, action, 'Cleared saved AI config.');
		}

		default: {
			return assertNever(platform);
		}
	}
}
