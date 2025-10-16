import {
	buildURLSearchParams,
	getRequiredParams,
	isInternalUrl,
	withQueryParams,
	type EncodableQueryParams,
} from '$lib/utils/url';
import { isHttpError, type HttpError } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';

describe(isInternalUrl.name, () => {
	it('should detect an internal absolute URL', () => {
		expect(isInternalUrl(new URL('https://www.example.org/foo'), 'https://www.example.org/bar')).to.equal(true);
	});

	it('should detect an internal relative URL', () => {
		expect(isInternalUrl('/foo', new URL('https://www.example.org/bar'))).to.equal(true);
	});

	it('should detect an external absolute URL', () => {
		expect(isInternalUrl('https://www.example.org:3000/bar', new URL('https://www.example.org/bar'))).to.equal(false);
	});

	it('should detect an external relative URL', () => {
		expect(isInternalUrl('//www.example.com/foo', 'https://www.example.org/bar')).to.equal(false);
	});
});

describe(buildURLSearchParams.name, () => {
	const CASES = {
		'should build empty params for empty object': { params: {}, expected: [] },
		'should build query params for a simple object': {
			params: { foo: 'bar', bar: undefined },
			expected: [['foo', 'bar']],
		},
		'should correctly encode arrays': {
			params: { foo: ['bar', 'baz'] },
			expected: [
				['foo[0]', 'bar'],
				['foo[1]', 'baz'],
			],
		},
		'should correctly encode complex structures': {
			params: { foo: ['bar', { baz: [1, 2] }, 'barbaz', undefined] },
			expected: [
				['foo[0]', 'bar'],
				['foo[1][baz][0]', '1'],
				['foo[1][baz][1]', '2'],
				['foo[2]', 'barbaz'],
			],
		},
	} satisfies Record<string, { params: EncodableQueryParams; expected: [string, string | undefined][] }>;

	Object.entries(CASES).forEach(([label, { params, expected }]) =>
		it(label, () => {
			expect([...buildURLSearchParams(params).entries()]).to.deep.equal(expected);
		}),
	);
});

describe(withQueryParams.name, () => {
	const CASES = {
		'should leave params untouched': {
			base: 'https://example.com/?foo=bar',
			params: {},
			merge: true,
			expected: 'https://example.com/?foo=bar',
		},
		'should clean query params': {
			base: 'https://example.com/?foo=bar',
			params: {},
			merge: false,
			expected: 'https://example.com/',
		},
		'should append and overwrite query params': {
			base: 'https://example.com/?foo=bar&bar=baz',
			params: { foo: 'barbaz', bar: undefined, baz: '1' },
			merge: true,
			expected: 'https://example.com/?foo=barbaz&baz=1',
		},
	} satisfies Record<string, { base: string | URL; params: EncodableQueryParams; merge: boolean; expected: string }>;

	Object.entries(CASES).forEach(([label, { base, params, merge = true, expected }]) =>
		it(label, () => {
			expect(withQueryParams(base, params, merge).toString()).to.equal(expected);
		}),
	);
});

describe(getRequiredParams.name, () => {
	it('should throw error if one param is missing', () => {
		expect(() => getRequiredParams(new Map([['foo', 'bar']]), ['foo', 'bar']))
			.to.throw()
			.that.satisfies((err: unknown) => isHttpError(err))
			.and.satisfies((err: HttpError) => err.status === 400);
	});

	it('should throw error if multiple params are missing', () => {
		expect(() => getRequiredParams(new Map([['foo', 'bar']]), ['foo', 'bar', 'baz']))
			.to.throw()
			.that.satisfies((err: unknown) => isHttpError(err))
			.and.satisfies((err: HttpError) => err.status === 400);
	});

	it('should return empty object if no parameter are required', () => {
		expect(getRequiredParams(new Map([['foo', 'bar']]), [])).to.deep.equals({});
	});

	it('should return requested parameters if all are present', () => {
		expect(
			getRequiredParams(
				new Map([
					['foo', 'bar'],
					['bar', 'baz'],
				]),
				['foo', 'bar'],
			),
		).to.deep.equals({ foo: 'bar', bar: 'baz' });
	});
});
