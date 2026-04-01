import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/components/**/*.test.tsx'],
		setupFiles: ['tests/components/setup.tsx'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			reportsDirectory: 'coverage/components',
			include: ['source/components/**/*.tsx'],
			thresholds: {
				lines: 80,
				functions: 80,
				statements: 80,
				branches: 80,
			},
		},
	},
});
