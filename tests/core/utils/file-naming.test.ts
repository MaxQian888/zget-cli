import {describe, expect, it} from 'vitest';
import {
	buildImageDir,
	buildMarkdownFilename,
	sanitizeFilename,
} from '../../../source/core/utils/file-naming';

describe('file naming helpers', () => {
	it('sanitizes, truncates, and defaults empty names', () => {
		expect(sanitizeFilename('  hello   world  ')).toBe('hello_world');
		expect(sanitizeFilename('a/b:c*d?e"f<g>h|i')).toBe('a_b_c_d_e_f_g_h_i');
		expect(sanitizeFilename('   ')).toBe('untitled');
		expect(sanitizeFilename('x'.repeat(300))).toHaveLength(200);
	});

	it('builds markdown filenames with optional date prefixes', () => {
		expect(buildMarkdownFilename('Hello World', 'Astro Air')).toBe(
			'Hello_World_Astro_Air.md',
		);
		expect(
			buildMarkdownFilename('Article / Title', 'Author Name', '20260401'),
		).toBe('(20260401)Article___Title_Author_Name.md');
	});

	it('reuses filename sanitization for image directories', () => {
		expect(buildImageDir(' WeChat Article / Images ')).toBe(
			'WeChat_Article___Images',
		);
	});
});
