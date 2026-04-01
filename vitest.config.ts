import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		include: [
			'tests/cli/**/*.test.tsx',
			'tests/docs/**/*.test.ts',
			'tests/git-hooks/**/*.test.ts',
			'tests/release/**/*.test.ts',
		],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: [
				'source/cli-metadata.ts',
				'tools/docs/**/*.ts',
				'tools/git-hooks/**/*.mjs',
				'tools/release/**/*.ts',
			],
			thresholds: {
				lines: 90,
				functions: 90,
				statements: 90,
				branches: 85,
			},
		},
	},
});
