import { addPrefix, safeBase64Decode, safeBase64Encode, stripPrefix } from '$lib/utils/string';
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

describe(safeBase64Encode.name, () => {
	it('should encode a string to base64', () => {
		expect(safeBase64Encode('hello world')).to.equal('aGVsbG8gd29ybGQ=');
	});

	it('should handle UTF-8 characters', () => {
		expect(safeBase64Encode('こんにちは')).to.equal('44GT44KT44Gr44Gh44Gv');
	});
});

describe(safeBase64Decode.name, () => {
	it('should decode a base64 string', () => {
		expect(safeBase64Decode('aGVsbG8gd29ybGQ=')).to.equal('hello world');
	});

	it('should handle UTF-8 characters', () => {
		expect(safeBase64Decode('44GT44KT44Gr44Gh44Gv')).to.equal('こんにちは');
	});

	it('should gracefully handle invalid base64 strings', () => {
		expect(safeBase64Decode('invalid!')).toBeUndefined();
	});
});
