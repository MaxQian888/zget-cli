import {access, readFile} from 'node:fs/promises';

export type GeneratedDocPair = {
	readonly expectedPath: string;
	readonly actualPath: string;
	readonly label: string;
};

export type GeneratedDocMismatch = {
	readonly label: string;
	readonly expectedPath: string;
	readonly actualPath: string;
	readonly reason: 'content_mismatch' | 'missing_actual' | 'missing_expected';
};

function normalizeGeneratedContent(content: string): string {
	return content.replace(/\r\n/g, '\n').trimEnd();
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

export async function findGeneratedDocMismatches(
	pairs: readonly GeneratedDocPair[],
): Promise<GeneratedDocMismatch[]> {
	const results = await Promise.all(
		pairs.map(async pair => {
			const [expectedExists, actualExists] = await Promise.all([
				pathExists(pair.expectedPath),
				pathExists(pair.actualPath),
			]);

			if (!expectedExists) {
				return {
					label: pair.label,
					expectedPath: pair.expectedPath,
					actualPath: pair.actualPath,
					reason: 'missing_expected',
				} satisfies GeneratedDocMismatch;
			}

			if (!actualExists) {
				return {
					label: pair.label,
					expectedPath: pair.expectedPath,
					actualPath: pair.actualPath,
					reason: 'missing_actual',
				} satisfies GeneratedDocMismatch;
			}

			const [expectedContent, actualContent] = await Promise.all([
				readFile(pair.expectedPath, 'utf8'),
				readFile(pair.actualPath, 'utf8'),
			]);

			if (
				normalizeGeneratedContent(expectedContent) !==
				normalizeGeneratedContent(actualContent)
			) {
				return {
					label: pair.label,
					expectedPath: pair.expectedPath,
					actualPath: pair.actualPath,
					reason: 'content_mismatch',
				} satisfies GeneratedDocMismatch;
			}

			return null;
		}),
	);

	return results.filter(
		(result): result is GeneratedDocMismatch => result !== null,
	);
}
