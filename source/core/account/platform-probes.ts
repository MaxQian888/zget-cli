import process from 'node:process';
import {CookieStore} from '../auth/cookie-store';
import {XCredentialStore} from '../auth/x-auth';
import {XhsCookieStore} from '../auth/xhs-auth';
import {BiliCookieStore} from '../auth/bili-auth';
import {WeiboCookieStore} from '../auth/weibo-auth';
import {HnCookieStore} from '../auth/hn-auth';
import {V2exTokenStore} from '../auth/v2ex-auth';
import {RedditCredentialStore} from '../auth/reddit-auth';
import {AiConfigStore} from '../ai/ai-config';
import type {LocalAccountState} from './types';

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

export async function probeZhihuLocalState(): Promise<LocalAccountState> {
	const store = new CookieStore();
	const isAuthenticated = await store.load();

	return {
		platform: 'zhihu',
		status: isAuthenticated ? 'detected' : 'missing',
		credentialSource: isAuthenticated ? 'cookies' : 'none',
	};
}

export async function probeTwitterLocalState(): Promise<LocalAccountState> {
	const store = new XCredentialStore();
	await store.load();

	if (!store.isConfigured()) {
		return {
			platform: 'x',
			status: 'missing',
			credentialSource: 'none',
		};
	}

	return {
		platform: 'x',
		status: 'detected',
		credentialSource: hasTwitterEnvCredentials() ? 'env' : 'file',
	};
}

export async function probeXhsLocalState(): Promise<LocalAccountState> {
	const store = new XhsCookieStore();
	await store.load();
	const isAuthenticated = store.isAuthenticated();

	return {
		platform: 'xhs',
		status: isAuthenticated ? 'detected' : 'missing',
		credentialSource: isAuthenticated ? 'cookies' : 'none',
	};
}

export async function probeBiliLocalState(): Promise<LocalAccountState> {
	const store = new BiliCookieStore();
	await store.load();
	const isAuthenticated = store.isAuthenticated();

	return {
		platform: 'bili',
		status: isAuthenticated ? 'detected' : 'missing',
		credentialSource: isAuthenticated ? 'cookies' : 'none',
	};
}

export async function probeWeiboLocalState(): Promise<LocalAccountState> {
	const store = new WeiboCookieStore();
	await store.load();
	const isAuthenticated = store.isAuthenticated();

	return {
		platform: 'weibo',
		status: isAuthenticated ? 'detected' : 'missing',
		credentialSource: isAuthenticated ? 'cookies' : 'none',
	};
}

export async function probeAiLocalState(): Promise<LocalAccountState> {
	const store = new AiConfigStore();
	await store.load();

	if (!store.isConfigured()) {
		return {
			platform: 'ai',
			status: 'missing',
			credentialSource: 'none',
		};
	}

	return {
		platform: 'ai',
		status: 'detected',
		credentialSource: hasAiEnvCredentials() ? 'env' : 'file',
	};
}

// Placeholder probes — replaced by real implementations when each platform's
// auth module lands. Each returns 'missing' so the account center treats the
// platform as available-to-add without trying to validate.

export async function probeRedditLocalState(): Promise<LocalAccountState> {
	const store = new RedditCredentialStore();
	await store.load();
	const isAuthenticated = store.isAuthenticated();
	return {
		platform: 'reddit',
		status: isAuthenticated ? 'detected' : 'missing',
		credentialSource: isAuthenticated ? 'file' : 'none',
	};
}

export async function probeHnLocalState(): Promise<LocalAccountState> {
	const store = new HnCookieStore();
	await store.load();
	const isAuthenticated = store.isAuthenticated();

	return {
		platform: 'hn',
		status: isAuthenticated ? 'detected' : 'missing',
		credentialSource: isAuthenticated ? 'cookies' : 'none',
	};
}

export async function probeV2exLocalState(): Promise<LocalAccountState> {
	const store = new V2exTokenStore();
	await store.load();
	const isAuthenticated = store.isAuthenticated();
	return {
		platform: 'v2ex',
		status: isAuthenticated ? 'detected' : 'missing',
		credentialSource: isAuthenticated ? 'file' : 'none',
	};
}

export async function probeDoubanLocalState(): Promise<LocalAccountState> {
	return {platform: 'douban', status: 'missing', credentialSource: 'none'};
}

export async function probeBskyLocalState(): Promise<LocalAccountState> {
	return {platform: 'bsky', status: 'missing', credentialSource: 'none'};
}
