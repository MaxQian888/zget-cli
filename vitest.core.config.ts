import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		include: ['tests/core/**/*.test.ts', 'tests/core/**/*.test.tsx'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			reportsDirectory: 'coverage/core',
			include: [
				'source/core/utils/**/*.ts',
				'source/core/state/**/*.ts',
				'source/core/ai/**/*.ts',
				'source/core/auth/bili-auth.ts',
				'source/core/auth/cookie-store.ts',
				'source/core/auth/x-auth.ts',
				'source/core/auth/xhs-auth.ts',
				'source/core/api/client.ts',
				'source/core/parser/**/*.ts',
			],
			thresholds: {
				lines: 80,
				functions: 80,
				statements: 80,
				branches: 80,
			},
		},
	},
});
