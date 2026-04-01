import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/source/commands/**/*.test.tsx'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['source/commands/**/*.tsx'],
			exclude: ['tests/**'],
			thresholds: {
				lines: 80,
				functions: 80,
				statements: 80,
				branches: 80,
			},
		},
	},
});
