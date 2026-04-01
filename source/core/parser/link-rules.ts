import type TurndownService from 'turndown';

export function addLinkRules(turndown: TurndownService): void {
	turndown.addRule('zhihu-links', {
		filter: 'a',
		replacement(content, node) {
			const element = node as HTMLAnchorElement;
			let href = element.getAttribute('href') ?? '';

			if (!href || href === '#') {
				return content;
			}

			// Normalize protocol-relative URLs
			if (href.startsWith('//')) {
				href = `https:${href}`;
			}

			// Extract target URL from Zhihu redirect links
			try {
				const parsed = new URL(href);
				const target = parsed.searchParams.get('target');
				if (target) {
					href = decodeURIComponent(target);
				}
			} catch {
				// Not a valid URL, keep as-is
			}

			const linkText =
				element.dataset?.text ??
				element.attributes.getNamedItem('data-text')?.value ??
				content ??
				href;
			return `[${linkText}](${href})`;
		},
	});
}
