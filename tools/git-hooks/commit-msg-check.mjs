#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import process from 'node:process';
import {pathToFileURL} from 'node:url';

const conventionalCommitPattern =
	/^(feat|fix|docs|refactor|test|chore)(\([\w.-]+\))?!?: .+/;

export function validateCommitMessage(commitMessage) {
	const normalizedMessage = commitMessage.trim();

	if (normalizedMessage.length === 0) {
		return ['[commit-msg] Commit message cannot be empty.'];
	}

	// Merge commits and reverts are managed by Git and should not be blocked.
	if (
		normalizedMessage.startsWith('Merge ') ||
		normalizedMessage.startsWith('Revert "')
	) {
		return [];
	}

	if (!conventionalCommitPattern.test(normalizedMessage)) {
		return [
			'[commit-msg] Invalid commit message format.',
			'[commit-msg] Expected: <type>(optional-scope): <summary>',
			'[commit-msg] Allowed types: feat, fix, docs, refactor, test, chore',
			`[commit-msg] Received: ${normalizedMessage}`,
		];
	}

	return [];
}

export function runCommitMessageCheck({
	argv = process.argv,
	readFile = filePath => readFileSync(filePath, 'utf8'),
	error = console.error,
	exit = code => process.exit(code),
} = {}) {
	const commitMessageFilePath = argv[2];

	if (!commitMessageFilePath) {
		error('[commit-msg] Missing commit message file path argument.');
		exit(1);
		return;
	}

	const validationErrors = validateCommitMessage(
		readFile(commitMessageFilePath),
	);

	if (validationErrors.length > 0) {
		for (const message of validationErrors) {
			error(message);
		}

		exit(1);
		return;
	}

	exit(0);
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	runCommitMessageCheck();
}
