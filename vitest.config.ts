import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['source/**/*.ts', 'source/**/*.tsx', 'tools/docs/**/*.ts'],
			exclude: ['source/cli.tsx', 'source/index.ts'],
			thresholds: {
				lines: 90,
				functions: 90,
				statements: 90,
				branches: 85,
			},
		},
	},
});
