// Subset of sysexits.h(3) that we surface from zget. Agents branch on these
// numeric codes to decide whether to retry, escalate, or surface to a human.
// See AGENT.md for the agent-facing contract.
// Names mirror the C constants (PascalCase + SCREAMING_SNAKE_CASE) to match
// the spec, so the local naming rule is suspended for this declaration.
/* eslint-disable @typescript-eslint/naming-convention */
export const ExitCode = {
	OK: 0,
	GENERAL: 1,
	USAGE: 64,
	DATA_ERR: 65,
	NO_INPUT: 66,
	UNAVAILABLE: 69,
	SOFTWARE: 70,
	CANTCREAT: 73,
	TEMPFAIL: 75,
	PROTOCOL: 76,
	NOPERM: 77,
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

const authNeededPatterns = [
	/未登录/,
	/请先运行.*login/i,
	/permission denied/i,
	/auth/i,
	/登录/,
	/cookie/i,
];

const temporaryFailPatterns = [
	/timeout/i,
	/timed out/i,
	/超时/,
	/network/i,
	/ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT/,
];

const dataErrorPatterns = [
	/无效.*链接/,
	/解析失败/,
	/未找到/,
	/parse.*fail/i,
	/invalid.*url/i,
];

// Best-effort mapping from a thrown error message to a sysexits code.
// Commands that have stronger signal (e.g. an HTTP response object)
// SHOULD set `error.exitCode` directly instead of relying on this.
export function classifyErrorCode(message: string): ExitCodeValue {
	if (authNeededPatterns.some(pattern => pattern.test(message))) {
		return ExitCode.NOPERM;
	}

	if (temporaryFailPatterns.some(pattern => pattern.test(message))) {
		return ExitCode.TEMPFAIL;
	}

	if (dataErrorPatterns.some(pattern => pattern.test(message))) {
		return ExitCode.DATA_ERR;
	}

	return ExitCode.GENERAL;
}

// Allows downloaders / API clients to attach a precise code to a thrown error.
export class CliError extends Error {
	readonly exitCode: ExitCodeValue;
	readonly hint?: string;

	constructor(message: string, exitCode: ExitCodeValue, hint?: string) {
		super(message);
		this.name = 'CliError';
		this.exitCode = exitCode;
		this.hint = hint;
	}
}

export function getExitCode(error: unknown): ExitCodeValue {
	if (error instanceof CliError) return error.exitCode;
	if (error instanceof Error) return classifyErrorCode(error.message);
	return ExitCode.GENERAL;
}

export function getErrorHint(error: unknown): string | undefined {
	if (error instanceof CliError && error.hint) return error.hint;
	return undefined;
}
