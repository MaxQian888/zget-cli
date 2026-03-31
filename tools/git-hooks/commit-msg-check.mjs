#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import process from 'node:process';

const commitMessageFilePath = process.argv[2];

if (!commitMessageFilePath) {
	console.error('[commit-msg] Missing commit message file path argument.');
	process.exit(1);
}

const commitMessage = readFileSync(commitMessageFilePath, 'utf8').trim();

if (commitMessage.length === 0) {
	console.error('[commit-msg] Commit message cannot be empty.');
	process.exit(1);
}

// Merge commits and reverts are managed by Git and should not be blocked.
if (
	commitMessage.startsWith('Merge ') ||
	commitMessage.startsWith('Revert "')
) {
	process.exit(0);
}

const conventionalCommitPattern =
	/^(feat|fix|docs|refactor|test|chore)(\([\w.-]+\))?!?: .+/;

if (!conventionalCommitPattern.test(commitMessage)) {
	console.error('[commit-msg] Invalid commit message format.');
	console.error('[commit-msg] Expected: <type>(optional-scope): <summary>');
	console.error(
		'[commit-msg] Allowed types: feat, fix, docs, refactor, test, chore',
	);
	console.error(`[commit-msg] Received: ${commitMessage}`);
	process.exit(1);
}
