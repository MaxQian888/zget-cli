import type TurndownService from 'turndown';

export function addMathRules(turndown: TurndownService): void {
	turndown.addRule('zhihu-math', {
		filter(node) {
			const element = node as HTMLSpanElement;
			const formulaValue =
				element.dataset?.tex ??
				element.attributes.getNamedItem('data-tex')?.value;
			const hasFormula = formulaValue !== undefined;
			return (
				node.nodeName === 'SPAN' &&
				element.classList?.contains('ztext-math') &&
				hasFormula
			);
		},
		replacement(_content, node) {
			const element = node as HTMLSpanElement;
			// PR #41 fix: trim whitespace from formula
			const formula = (
				element.dataset?.tex ??
				element.attributes.getNamedItem('data-tex')?.value ??
				''
			).trim();
			if (!formula) return '';

			// Block formula: contains \tag{}
			if (formula.includes('\\tag')) {
				return `\n\n$$${formula}$$\n\n`;
			}

			// If formula already contains $ delimiters, use as-is
			if (formula.includes('$')) {
				return formula;
			}

			// Inline formula
			return `$${formula}$`;
		},
	});
}
