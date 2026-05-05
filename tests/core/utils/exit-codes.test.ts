import {describe, expect, it} from 'vitest';
import {
	classifyErrorCode,
	CliError,
	ExitCode,
	getErrorHint,
	getExitCode,
} from '../../../source/core/utils/exit-codes';

describe('ExitCode constants', () => {
	it('exposes the sysexits.h subset', () => {
		expect(ExitCode.OK).toBe(0);
		expect(ExitCode.USAGE).toBe(64);
		expect(ExitCode.NOPERM).toBe(77);
		expect(ExitCode.TEMPFAIL).toBe(75);
		expect(ExitCode.DATA_ERR).toBe(65);
	});
});

describe('classifyErrorCode', () => {
	it('maps auth-related messages to NOPERM', () => {
		expect(classifyErrorCode('未登录，请先运行 "zget xhs login"')).toBe(
			ExitCode.NOPERM,
		);
		expect(classifyErrorCode('Permission denied for resource')).toBe(
			ExitCode.NOPERM,
		);
	});

	it('maps timeouts and network errors to TEMPFAIL', () => {
		expect(classifyErrorCode('Request timed out')).toBe(ExitCode.TEMPFAIL);
		expect(classifyErrorCode('网络超时')).toBe(ExitCode.TEMPFAIL);
		expect(classifyErrorCode('connect ECONNREFUSED')).toBe(ExitCode.TEMPFAIL);
	});

	it('maps parse failures to DATA_ERR', () => {
		expect(classifyErrorCode('无效的回答链接')).toBe(ExitCode.DATA_ERR);
		expect(classifyErrorCode('Invalid URL: foo')).toBe(ExitCode.DATA_ERR);
		expect(classifyErrorCode('解析失败：missing field')).toBe(
			ExitCode.DATA_ERR,
		);
	});

	it('falls back to GENERAL for unrecognized text', () => {
		expect(classifyErrorCode('something exploded')).toBe(ExitCode.GENERAL);
	});
});

describe('CliError', () => {
	it('carries an exit code and optional hint', () => {
		const error = new CliError('需要登录', ExitCode.NOPERM, '运行 zget login');
		expect(error.exitCode).toBe(ExitCode.NOPERM);
		expect(error.hint).toBe('运行 zget login');
		expect(getExitCode(error)).toBe(ExitCode.NOPERM);
		expect(getErrorHint(error)).toBe('运行 zget login');
	});

	it('classifies plain Error via heuristics', () => {
		expect(getExitCode(new Error('Request timeout'))).toBe(ExitCode.TEMPFAIL);
		expect(getErrorHint(new Error('any'))).toBeUndefined();
	});

	it('treats unknown values as GENERAL', () => {
		expect(getExitCode('a string')).toBe(ExitCode.GENERAL);
		expect(getExitCode(undefined)).toBe(ExitCode.GENERAL);
	});
});
