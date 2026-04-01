import {execFile as execFileCallback} from 'node:child_process';
import {mkdtemp as makeTemporaryDirectory, readdir, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {pathToFileURL} from 'node:url';
import {promisify} from 'node:util';

type PackCheckDependencies = {
	readonly cwd?: string;
	readonly mkdtemp?: (prefix: string) => Promise<string>;
	readonly readdir?: (path: string) => Promise<string[]>;
	readonly rm?: (
		path: string,
		options: {recursive: true; force: true},
	) => Promise<void>;
	readonly execFile?: (
		file: string,
		args: string[],
		options: {cwd: string},
	) => Promise<{stdout: string; stderr: string}>;
	readonly log?: (message: string) => void;
	readonly error?: (message: string) => void;
	readonly exit?: (code: number) => void;
	readonly platform?: NodeJS.Platform;
	readonly tmpdir?: () => string;
};

const execFile = promisify(execFileCallback);

export function resolvePackCommand(
	platform: NodeJS.Platform,
	outputDirectory: string,
): {file: string; args: string[]} {
	if (platform === 'win32') {
		const escapedOutputDirectory = outputDirectory.includes(' ')
			? `"${outputDirectory}"`
			: outputDirectory;

		return {
			file: 'cmd.exe',
			args: [
				'/d',
				'/s',
				'/c',
				`pnpm pack --pack-destination ${escapedOutputDirectory}`,
			],
		};
	}

	return {
		file: 'pnpm',
		args: ['pack', '--pack-destination', outputDirectory],
	};
}

export async function verifyPackArtifact(
	dependencies: PackCheckDependencies = {},
): Promise<string> {
	const {
		cwd = process.cwd(),
		mkdtemp = makeTemporaryDirectory,
		readdir: readDirectory = readdir,
		rm: remove = rm,
		execFile: runCommand = execFile,
		platform = process.platform,
		tmpdir = os.tmpdir,
	} = dependencies;

	const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'zget-pack-'));

	try {
		try {
			const packCommand = resolvePackCommand(platform, temporaryDirectory);
			await runCommand(packCommand.file, packCommand.args, {cwd});
		} catch (error_: unknown) {
			throw new Error(
				`[release] pnpm pack failed: ${
					error_ instanceof Error ? error_.message : 'Unknown error'
				}`,
			);
		}

		const directoryEntries = await readDirectory(temporaryDirectory);
		const packageArtifacts = directoryEntries
			.filter(file => file.endsWith('.tgz'))
			.sort();

		if (packageArtifacts.length === 0) {
			throw new Error('[release] pnpm pack did not create any .tgz artifact.');
		}

		return packageArtifacts[0];
	} finally {
		await remove(temporaryDirectory, {
			recursive: true,
			force: true,
		});
	}
}

export async function runPackCheck(
	dependencies: PackCheckDependencies = {},
): Promise<void> {
	const {
		log = console.log,
		error = console.error,
		exit = process.exit,
	} = dependencies;

	try {
		const packageArtifact = await verifyPackArtifact(dependencies);
		log(`[release] Pack artifact created: ${packageArtifact}`);
		exit(0);
	} catch (error_: unknown) {
		error(
			error_ instanceof Error
				? error_.message
				: '[release] Pack verification failed.',
		);
		exit(1);
	}
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	await runPackCheck();
}
