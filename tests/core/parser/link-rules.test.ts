import TurndownService from 'turndown';
import {describe, expect, it} from 'vitest';
import {addLinkRules} from '../../../source/core/parser/link-rules';

describe('addLinkRules', () => {
	it('normalizes protocol-relative redirects and prefers dataset text', () => {
		const turndown = new TurndownService();
		addLinkRules(turndown);

		const markdown = turndown.turndown(`
			<a
				href="//link.zhihu.com/?target=https%3A%2F%2Fopenai.com%2Fresearch"
				data-text="OpenAI"
			>
				ignored
			</a>
		`);

		expect(markdown).toBe('[OpenAI](https://openai.com/research)');
	});

	it('leaves plain content untouched when links are missing or empty', () => {
		const turndown = new TurndownService();
		addLinkRules(turndown);

		expect(turndown.turndown('<a href="#">Anchor</a>')).toBe('Anchor');
		expect(turndown.turndown('<a>Plain</a>')).toBe('Plain');
		expect(
			turndown.turndown('<a href="mailto:test@example.com">Mail</a>'),
		).toBe('[Mail](mailto:test@example.com)');
	});
});
