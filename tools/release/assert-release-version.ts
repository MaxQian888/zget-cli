import {readFileSync} from 'node:fs';
import process from 'node:process';
import {pathToFileURL} from 'node:url';

export type ReleaseManifest = {
	readonly name: string;
	readonly version: string;
};

type ReleaseVersionAssertionDependencies = {
	readonly argv?: string[];
	readonly readFile?: (path: URL | string, encoding: string) => string;
	readonly manifestPath?: URL | string;
	readonly log?: (message: string) => void;
	readonly error?: (message: string) => void;
	readonly exit?: (code: number) => void;
};

const releaseTagPattern =
	/^v(?<version>\d+\.\d+\.\d+(?:-[\dA-Za-z.-]+)?(?:\+[\dA-Za-z.-]+)?)$/;

function getDefaultManifestPath(): URL {
	return new URL('../../package.json', import.meta.url);
}

export function getVersionFromReleaseTag(tag: string): string {
	const normalizedTag = tag.replace(/^refs\/tags\//, '');
	const match = releaseTagPattern.exec(normalizedTag);

	if (!match?.groups?.version) {
		throw new Error(
			`[release] Expected a tag in the form vX.Y.Z. Received: ${tag}`,
		);
	}

	return match.groups.version;
}

export function readReleaseManifest(
	readFile: (path: URL | string, encoding: string) => string = readFileSync,
	manifestPath: URL | string = getDefaultManifestPath(),
): ReleaseManifest {
	return JSON.parse(readFile(manifestPath, 'utf8')) as ReleaseManifest;
}

export function assertReleaseTagMatchesVersion(
	tag: string,
	manifest: ReleaseManifest,
): string {
	const tagVersion = getVersionFromReleaseTag(tag);

	if (tagVersion !== manifest.version) {
		throw new Error(
			`[release] Tag ${tag.replace(
				/^refs\/tags\//,
				'',
			)} does not match package version ${manifest.version}.`,
		);
	}

	return tagVersion;
}

export function runReleaseVersionAssertion(
	dependencies: ReleaseVersionAssertionDependencies = {},
): void {
	const {
		argv = process.argv,
		readFile = readFileSync,
		manifestPath = getDefaultManifestPath(),
		log = console.log,
		error = console.error,
		exit = process.exit,
	} = dependencies;

	const releaseTag = argv[2];

	if (!releaseTag) {
		error('[release] Missing release tag argument.');
		exit(1);
		return;
	}

	try {
		const manifest = readReleaseManifest(readFile, manifestPath);
		assertReleaseTagMatchesVersion(releaseTag, manifest);
		log(
			`[release] Tag ${releaseTag.replace(
				/^refs\/tags\//,
				'',
			)} matches package ${manifest.name}@${manifest.version}.`,
		);
		exit(0);
	} catch (error_: unknown) {
		error(
			error_ instanceof Error
				? error_.message
				: '[release] Failed to validate release version.',
		);
		exit(1);
	}
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	runReleaseVersionAssertion();
}
