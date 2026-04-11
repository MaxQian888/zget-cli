import {ApiClient} from '../api/client';
import {ZhihuApi} from '../api/zhihu-api';
import {XApi} from '../api/x-api';
import {XhsApi} from '../api/xhs-api';
import {BiliApi} from '../api/bili-api';
import {AiConfigStore} from '../ai/ai-config';
import {CookieStore} from '../auth/cookie-store';
import {XCredentialStore} from '../auth/x-auth';
import {XhsCookieStore} from '../auth/xhs-auth';
import {BiliCookieStore} from '../auth/bili-auth';
import {
	probeAiLocalState,
	probeBiliLocalState,
	probeTwitterLocalState,
	probeXhsLocalState,
	probeZhihuLocalState,
} from './platform-probes';
import type {
	AccountPlatform,
	AccountStateSnapshot,
	LocalAccountState,
} from './types';

const orderedPlatforms: AccountPlatform[] = ['zhihu', 'x', 'xhs', 'bili', 'ai'];

function assertNever(value: never): never {
	throw new Error(`Unsupported platform: ${String(value)}`);
}

function markValidated(
	state: LocalAccountState,
	overrides: Omit<
		Partial<AccountStateSnapshot>,
		'platform' | 'credentialSource'
	> = {},
): AccountStateSnapshot {
	return {
		...state,
		...overrides,
		lastValidatedAt: overrides.lastValidatedAt ?? new Date().toISOString(),
	};
}

function markError(
	state: LocalAccountState,
	error: unknown,
): AccountStateSnapshot {
	return {
		...state,
		status: 'error',
		latestError: error instanceof Error ? error.message : String(error),
		lastValidatedAt: new Date().toISOString(),
	};
}

async function validateZhihu(
	state: LocalAccountState,
): Promise<AccountStateSnapshot> {
	const cookieStore = new CookieStore();
	await cookieStore.load();
	const api = new ZhihuApi(new ApiClient({cookieStore}));
	const session = await api.validateSession();

	if (!session.valid) {
		return {
			...state,
			status: 'error',
			latestError: 'Zhihu session validation failed.',
			lastValidatedAt: new Date().toISOString(),
		};
	}

	return markValidated(state, {
		status: 'ready',
		identity: session.name
			? {
					displayName: session.name,
			  }
			: undefined,
	});
}

async function validateX(
	state: LocalAccountState,
): Promise<AccountStateSnapshot> {
	const credentialStore = new XCredentialStore();
	await credentialStore.load();
	const api = new XApi(credentialStore);
	const response = await api.getMyUser();

	return markValidated(state, {
		status: 'ready',
		identity: {
			id: response.data.id,
			displayName: response.data.name,
			handle: `@${response.data.username}`,
		},
	});
}

async function validateXhs(
	state: LocalAccountState,
): Promise<AccountStateSnapshot> {
	const cookieStore = new XhsCookieStore();
	await cookieStore.load();
	const api = new XhsApi(cookieStore);
	await api.init();

	try {
		const profile = await api.getMyProfile();
		return markValidated(state, {
			status: 'ready',
			identity: {
				id: profile.userId,
				displayName: profile.nickname,
			},
		});
	} finally {
		await api.close();
	}
}

async function validateBili(
	state: LocalAccountState,
): Promise<AccountStateSnapshot> {
	const cookieStore = new BiliCookieStore();
	await cookieStore.load();
	const api = new BiliApi(cookieStore);
	const profile = await api.getMyInfo();

	return markValidated(state, {
		status: 'ready',
		identity: {
			id: String(profile.mid),
			displayName: profile.name,
		},
	});
}

async function validateAi(
	state: LocalAccountState,
): Promise<AccountStateSnapshot> {
	const configStore = new AiConfigStore();
	await configStore.load();

	if (!configStore.isConfigured()) {
		return state;
	}

	const config = configStore.getConfig();

	return {
		...state,
		identity:
			config?.provider === undefined
				? undefined
				: {
						displayName: config.provider,
				  },
	};
}

async function resolveLocalState(
	platform: AccountPlatform,
): Promise<LocalAccountState> {
	switch (platform) {
		case 'zhihu': {
			return probeZhihuLocalState();
		}

		case 'x': {
			return probeTwitterLocalState();
		}

		case 'xhs': {
			return probeXhsLocalState();
		}

		case 'bili': {
			return probeBiliLocalState();
		}

		case 'ai': {
			return probeAiLocalState();
		}

		default: {
			return assertNever(platform);
		}
	}
}

export async function getPlatformAccountState(
	platform: AccountPlatform,
): Promise<AccountStateSnapshot> {
	const localState = await resolveLocalState(platform);
	if (localState.status === 'missing') {
		return localState;
	}

	try {
		switch (platform) {
			case 'zhihu': {
				return await validateZhihu(localState);
			}

			case 'x': {
				return await validateX(localState);
			}

			case 'xhs': {
				return await validateXhs(localState);
			}

			case 'bili': {
				return await validateBili(localState);
			}

			case 'ai': {
				return await validateAi(localState);
			}

			default: {
				return assertNever(platform);
			}
		}
	} catch (error: unknown) {
		return markError(localState, error);
	}
}

export async function getAccountOverview(): Promise<AccountStateSnapshot[]> {
	return Promise.all(
		orderedPlatforms.map(async platform => getPlatformAccountState(platform)),
	);
}
