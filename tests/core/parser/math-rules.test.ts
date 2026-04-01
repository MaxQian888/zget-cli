import TurndownService from 'turndown';
import {describe, expect, it} from 'vitest';
import {addMathRules} from '../../../source/core/parser/math-rules';

describe('addMathRules', () => {
	it('renders inline formulas, block formulas, and already-delimited formulas', () => {
		const turndown = new TurndownService();
		addMathRules(turndown);

		const markdown = turndown.turndown(`
			<p><span class="ztext-math" data-tex=" a + b ">formula</span></p>
			<p><span class="ztext-math" data-tex="\\tag{1}x^2 + y^2">formula</span></p>
			<p><span class="ztext-math" data-tex="$x$">$x$</span></p>
			<p><span class="ztext-math" data-tex="   ">blank</span></p>
		`);

		expect(markdown).toContain('$a + b$');
		expect(markdown).toContain('$$\\tag{1}x^2 + y^2$$');
		expect(markdown).toContain('$x$');
		expect(markdown).not.toContain('blank');
	});
});
