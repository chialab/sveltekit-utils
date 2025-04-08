import { stripHtml } from '$lib/utils/html';
import { describe, expect, it } from 'vitest';

describe(stripHtml.name, async () => {
	const CASES = {
		'should remove tag': { html: 'hello <a href="https://example.org/">world</a>', expected: 'hello world' },
		'should remove comments and HTML entities': {
			html: '<span lang="it">questo &egrave; un test <!-- This is a test --></span>',
			expected: 'questo è un test ',
		},
	} satisfies Record<string, { html: string | undefined | null; expected: string }>;

	Object.entries(CASES).forEach(([label, { html, expected }]) =>
		it(label, () => {
			expect(stripHtml(html)).to.equal(expected);
		}),
	);
});
