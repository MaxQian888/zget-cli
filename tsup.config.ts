import {defineConfig} from 'tsup';

export default defineConfig({
	entry: ['source/cli.tsx'],
	format: ['esm'],
	target: 'node20',
	outDir: 'dist',
	clean: true,
	splitting: false,
	sourcemap: true,
	dts: false,
	// Keep all heavy deps external - they're installed as dependencies
	external: [
		'ink',
		'react',
		'@inkjs/ui',
		'qrcode',
		'cheerio',
		'turndown',
		'sanitize-filename',
		'undici',
		'meow',
		'playwright',
		'dotenv',
	],
	esbuildOptions(options) {
		options.jsx = 'automatic';
	},
});
