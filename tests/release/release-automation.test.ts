import {describe, expect, it, vi} from 'vitest';
import {
	assertReleaseTagMatchesVersion,
	getVersionFromReleaseTag,
	runReleaseVersionAssertion,
} from '../../tools/release/assert-release-version';
import {resolvePackCommand, runPackCheck} from '../../tools/release/check-pack';

describe('release tag validation', () => {
	it('extracts the package version from a release tag', () => {
		expect(getVersionFromReleaseTag('v1.2.3')).toBe('1.2.3');
		expect(getVersionFromReleaseTag('refs/tags/v2.0.0')).toBe('2.0.0');
	});

	it('rejects tags that do not use the v-prefixed semver format', () => {
		expect(() => getVersionFromReleaseTag('1.2.3')).toThrow(
			'[release] Expected a tag in the form vX.Y.Z. Received: 1.2.3',
		);
	});

	it('rejects release tags that do not match package.json version', () => {
		expect(() =>
			assertReleaseTagMatchesVersion('v1.2.3', {
				name: 'zget-cli',
				version: '1.2.4',
			}),
		).toThrow('[release] Tag v1.2.3 does not match package version 1.2.4.');
	});

	it('supports process-style release validation dependencies', () => {
		const readFile = vi.fn(() =>
			JSON.stringify({
				name: 'zget-cli',
				version: '1.2.3',
			}),
		);
		const log = vi.fn();
		const error = vi.fn();
		const exit = vi.fn();

		runReleaseVersionAssertion({
			argv: ['node', 'tools/release/assert-release-version.ts', 'v1.2.3'],
			readFile,
			log,
			error,
			exit,
		});

		expect(log).toHaveBeenCalledWith(
			'[release] Tag v1.2.3 matches package zget-cli@1.2.3.',
		);
		expect(error).not.toHaveBeenCalled();
		expect(exit).toHaveBeenCalledWith(0);
	});
});

describe('pack verification', () => {
	it('uses the platform-specific pack command', () => {
		expect(resolvePackCommand('win32', 'temp-dir')).toEqual({
			file: 'cmd.exe',
			args: ['/d', '/s', '/c', 'pnpm pack --pack-destination temp-dir'],
		});
		expect(resolvePackCommand('linux', 'temp-dir')).toEqual({
			file: 'pnpm',
			args: ['pack', '--pack-destination', 'temp-dir'],
		});
	});

	it('fails when no tarball is produced', async () => {
		const error = vi.fn();
		const exit = vi.fn();
		const rm = vi.fn();

		await runPackCheck({
			cwd: 'D:/Project/zget-cli',
			mkdtemp: vi.fn(async () => 'temp-dir'),
			readdir: vi.fn(async () => []),
			rm,
			execFile: vi.fn(async () => ({stdout: '', stderr: ''})),
			log: vi.fn(),
			error,
			exit,
			platform: 'linux',
		});

		expect(error).toHaveBeenCalledWith(
			'[release] pnpm pack did not create any .tgz artifact.',
		);
		expect(exit).toHaveBeenCalledWith(1);
		expect(rm).toHaveBeenCalledWith('temp-dir', {
			force: true,
			recursive: true,
		});
	});

	it('reports the generated tarball when pack succeeds', async () => {
		const log = vi.fn();
		const error = vi.fn();
		const exit = vi.fn();

		await runPackCheck({
			cwd: 'D:/Project/zget-cli',
			mkdtemp: vi.fn(async () => 'temp-dir'),
			readdir: vi.fn(async () => ['zget-cli-1.2.3.tgz']),
			rm: vi.fn(async () => undefined),
			execFile: vi.fn(async () => ({stdout: '', stderr: ''})),
			log,
			error,
			exit,
			platform: 'linux',
		});

		expect(log).toHaveBeenCalledWith(
			'[release] Pack artifact created: zget-cli-1.2.3.tgz',
		);
		expect(error).not.toHaveBeenCalled();
		expect(exit).toHaveBeenCalledWith(0);
	});
});
