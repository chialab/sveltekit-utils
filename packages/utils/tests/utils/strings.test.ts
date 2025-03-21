import { addPrefix, stripPrefix } from '$lib/utils/string';
import { describe, expect, it } from 'vitest';

describe(addPrefix.name, () => {
	const CASES = {
		'should add prefix': { expected: 'foo:bar', prefix: 'foo:', value: 'bar' },
		'should return prefix when value is undefined': { expected: 'foo:', prefix: 'foo:', value: undefined },
		'should return value when prefix is undefined': { expected: 'bar', prefix: undefined, value: 'bar' },
		'should return empty string when both are undefined': { expected: '', prefix: undefined, value: undefined },
	} satisfies Record<string, { expected: string; prefix: string | undefined; value: string | undefined }>;

	Object.entries(CASES).forEach(([label, { expected, prefix, value }]) =>
		it(label, () => {
			expect(addPrefix(prefix, value)).to.equal(expected);
		}),
	);
});

describe(stripPrefix.name, () => {
	const CASES = {
		'should remove prefix': { expected: 'bar', prefix: 'foo:', value: 'foo:bar' },
		'should return undefined when value does not start with prefix': {
			expected: undefined,
			prefix: 'foo:',
			value: 'bar:baz',
		},
		'should return value when prefix is undefined': { expected: 'bar', prefix: undefined, value: 'bar' },
		'should return empty string when value is prefix': { expected: '', prefix: 'foo:', value: 'foo:' },
	} satisfies Record<string, { expected: string | undefined; prefix: string | undefined; value: string }>;

	Object.entries(CASES).forEach(([label, { expected, prefix, value }]) =>
		it(label, () => {
			expect(stripPrefix(prefix, value)).to.equal(expected);
		}),
	);
});
