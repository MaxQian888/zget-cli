export type AccountPlatform = 'zhihu' | 'x' | 'xhs' | 'bili' | 'weibo' | 'ai';

export type AccountStatus = 'missing' | 'detected' | 'ready' | 'error';

export type AccountCredentialSource = 'none' | 'env' | 'file' | 'cookies';

export type LocalAccountState = {
	platform: AccountPlatform;
	status: AccountStatus;
	credentialSource: AccountCredentialSource;
};

export type AccountIdentity = {
	id?: string;
	displayName: string;
	handle?: string;
};

export type AccountStateSnapshot = LocalAccountState & {
	identity?: AccountIdentity;
	latestError?: string;
	lastValidatedAt?: string;
};

export type AccountAction = 'login' | 'recheck' | 'clear';

export type AccountActionResult = {
	ok: boolean;
	action: AccountAction;
	message: string;
	nextCommand?: string;
	state?: AccountStateSnapshot;
};
