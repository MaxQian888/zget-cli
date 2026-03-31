import {afterEach, describe, expect, it, vi} from 'vitest';

describe('tooling baseline fallback resolution', () => {
	afterEach(() => {
		vi.resetModules();
		vi.restoreAllMocks();
	});

	it('falls back to dependencies when a package is not present in devDependencies', async () => {
		vi.doMock('node:fs', () => ({
			readFileSync: vi.fn(() =>
				JSON.stringify({
					dependencies: {
						typedoc: '9.9.9',
					},
					devDependencies: {},
				}),
			),
		}));
		const {buildToolingBaselineMarkdown} = await import(
			'../../tools/docs/tooling-baseline'
		);

		expect(buildToolingBaselineMarkdown()).toContain('| TypeDoc | 9.9.9 |');
	});

	it('shows not-installed when a tracked package is absent from the manifest', async () => {
		vi.doMock('node:fs', () => ({
			readFileSync: vi.fn(() =>
				JSON.stringify({
					dependencies: {},
					devDependencies: {},
				}),
			),
		}));
		const {buildToolingBaselineMarkdown} = await import(
			'../../tools/docs/tooling-baseline'
		);

		expect(buildToolingBaselineMarkdown()).toContain(
			'| TypeDoc | not-installed |',
		);
	});
});
