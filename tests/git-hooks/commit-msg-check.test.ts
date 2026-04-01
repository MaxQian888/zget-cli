import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
	runCommitMessageCheck,
	validateCommitMessage,
} from '../../tools/git-hooks/commit-msg-check.mjs';

describe('commit message hook', () => {
	const originalArgv = [...process.argv];
	const temporaryDirectories: string[] = [];
	const readFile = vi.fn();
	const error = vi.fn();
	const exit = vi.fn();

	beforeEach(() => {
		process.argv = [...originalArgv];
		readFile.mockReset();
		error.mockReset();
		exit.mockReset();
		vi.restoreAllMocks();
	});

	afterEach(async () => {
		process.argv = [...originalArgv];
		await Promise.all(
			temporaryDirectories
				.splice(0)
				.map(async directory => rm(directory, {recursive: true, force: true})),
		);
		vi.restoreAllMocks();
	});

	it('rejects invocations without a commit message file path', () => {
		runCommitMessageCheck({
			argv: ['node', 'tools/git-hooks/commit-msg-check.mjs'],
			readFile,
			error,
			exit,
		});

		expect(error).toHaveBeenCalledWith(
			'[commit-msg] Missing commit message file path argument.',
		);
		expect(exit).toHaveBeenCalledWith(1);
		expect(readFile).not.toHaveBeenCalled();
	});

	it('rejects empty commit messages', () => {
		readFile.mockReturnValue('   \n');

		runCommitMessageCheck({
			argv: ['node', 'tools/git-hooks/commit-msg-check.mjs', 'COMMIT_EDITMSG'],
			readFile,
			error,
			exit,
		});

		expect(readFile).toHaveBeenCalledWith('COMMIT_EDITMSG');
		expect(error).toHaveBeenCalledWith(
			'[commit-msg] Commit message cannot be empty.',
		);
		expect(exit).toHaveBeenCalledWith(1);
	});

	it('allows merge commits', () => {
		readFile.mockReturnValue('Merge branch "feature/test" into main\n');

		runCommitMessageCheck({
			argv: ['node', 'tools/git-hooks/commit-msg-check.mjs', 'COMMIT_EDITMSG'],
			readFile,
			error,
			exit,
		});

		expect(error).not.toHaveBeenCalled();
		expect(exit).toHaveBeenCalledWith(0);
	});

	it('allows revert commits', () => {
		readFile.mockReturnValue('Revert "feat(cli): add summary command"\n');

		runCommitMessageCheck({
			argv: ['node', 'tools/git-hooks/commit-msg-check.mjs', 'COMMIT_EDITMSG'],
			readFile,
			error,
			exit,
		});

		expect(error).not.toHaveBeenCalled();
		expect(exit).toHaveBeenCalledWith(0);
	});

	it('allows valid conventional commits', () => {
		readFile.mockReturnValue('feat(cli): support feed download\n');

		runCommitMessageCheck({
			argv: ['node', 'tools/git-hooks/commit-msg-check.mjs', 'COMMIT_EDITMSG'],
			readFile,
			error,
			exit,
		});

		expect(error).not.toHaveBeenCalled();
		expect(exit).toHaveBeenCalledWith(0);
	});

	it('rejects invalid commit messages with actionable guidance', () => {
		readFile.mockReturnValue('update cli behavior\n');

		runCommitMessageCheck({
			argv: ['node', 'tools/git-hooks/commit-msg-check.mjs', 'COMMIT_EDITMSG'],
			readFile,
			error,
			exit,
		});

		expect(error.mock.calls).toEqual([
			['[commit-msg] Invalid commit message format.'],
			['[commit-msg] Expected: <type>(optional-scope): <summary>'],
			['[commit-msg] Allowed types: feat, fix, docs, refactor, test, chore'],
			['[commit-msg] Received: update cli behavior'],
		]);
		expect(exit).toHaveBeenCalledWith(1);
	});

	it('supports default process-backed dependencies', async () => {
		const temporaryRoot = await mkdtemp(
			path.join(os.tmpdir(), 'commit-msg-check-'),
		);
		temporaryDirectories.push(temporaryRoot);

		const commitMessageFile = path.join(temporaryRoot, 'COMMIT_EDITMSG');
		await writeFile(
			commitMessageFile,
			'fix(cli): support default dependency wiring\n',
			'utf8',
		);

		process.argv = [
			'node',
			'tools/git-hooks/commit-msg-check.mjs',
			commitMessageFile,
		];

		const exitSpy = vi
			.spyOn(process, 'exit')
			.mockImplementation((() => undefined) as never);

		runCommitMessageCheck();

		expect(exitSpy).toHaveBeenCalledWith(0);
	});
});

describe('validateCommitMessage', () => {
	it('trims commit messages before validation', () => {
		expect(
			validateCommitMessage('  fix(cli): tighten hook checks  \n'),
		).toEqual([]);
	});
});
