import { sanitizeHtml } from '$lib/utils/browser';
import { describe, expect, it } from 'vitest';

describe(sanitizeHtml.name, async () => {
	const CASES = {
		'should remove tag': { html: 'hello <a href="https://example.org/">world</a>', expected: 'hello world' },
	} satisfies Record<string, { html: string | undefined | null; expected: string }>;

	Object.entries(CASES).forEach(([label, { html, expected }]) =>
		it(label, () => {
			expect(sanitizeHtml(html)).to.equal(expected);
		}),
	);
});
