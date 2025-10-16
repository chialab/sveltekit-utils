import { asyncIterablePool, isPromiseLike, lazyLoad, mapIterator } from '$lib/utils/promises';
import { describe, expect, it } from 'vitest';

describe(isPromiseLike.name, () => {
	const CASES = {
		'should recognize a resolved Promise': { expected: true, value: Promise.resolve(42) },
		'should recognize a pending Promise': { expected: true, value: new Promise(() => {}) },
		'should recognize a promise-like object': { expected: true, value: { then: () => {} } },
		'should not recognize a number': { expected: false, value: 42 },
		'should not recognize null': { expected: false, value: null },
		'should not recognize undefined': { expected: false, value: undefined },
		'should not recognize a Date': { expected: false, value: new Date() },
	} satisfies Record<string, { expected: boolean; value: PromiseLike<unknown> | unknown }>;

	Object.entries(CASES).forEach(([label, { expected, value }]) =>
		it(label, () => {
			expect(isPromiseLike(value)).to.equal(expected);
		}),
	);
});

describe.todo(lazyLoad.name);

describe.todo(asyncIterablePool.name);

describe(mapIterator.name, () => {
	async function* mkAsyncGenerator<T>(...items: readonly T[]): AsyncIterable<T> {
		yield* items;
	}

	function* mkGenerator<T>(...items: readonly T[]): Iterable<T> {
		yield* items;
	}

	it('should remap an async iterator', async () => {
		const expected = ['0: 1', '1: 2', '2: 3'];
		const results: string[] = [];
		for await (const mapped of mapIterator(mkAsyncGenerator(1, 2, 3), (it, idx) => `${idx}: ${it}`)) {
			results.push(mapped);
		}

		expect(results).to.deep.equal(expected);
	});

	it('should remap an iterator with an async function', async () => {
		const expected = ['0: 1', '1: 2', '2: 3'];
		const results: string[] = [];
		for await (const mapped of mapIterator(mkGenerator(1, 2, 3), async (it, idx) => `${idx}: ${it}`)) {
			results.push(mapped);
		}

		expect(results).to.deep.equal(expected);
	});
});
