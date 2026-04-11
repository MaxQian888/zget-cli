import process from 'node:process';
import {CookieStore} from '../auth/cookie-store';
import {XCredentialStore} from '../auth/x-auth';
import {XhsCookieStore} from '../auth/xhs-auth';
import {BiliCookieStore} from '../auth/bili-auth';
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
