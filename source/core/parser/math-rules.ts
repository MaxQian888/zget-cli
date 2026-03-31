import type TurndownService from 'turndown';

export function addMathRules(turndown: TurndownService): void {
	turndown.addRule('zhihu-math', {
		filter(node) {
			return (
				node.nodeName === 'SPAN' &&
				node.classList.contains('ztext-math') &&
				Object.hasOwn(node.dataset, 'tex')
			);
		},
		replacement(_content, node) {
			const element = node;
			// PR #41 fix: trim whitespace from formula
			const formula = (element.dataset.tex ?? '').trim();
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
