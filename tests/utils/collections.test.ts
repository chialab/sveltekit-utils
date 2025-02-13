import { entries, group, sift } from '$lib/utils/collections';
import { describe, expect, it } from 'vitest';

describe(group.name, () => {
	it('should group items when using default comparison and single group', () => {
		const items = [
			{ foo: 'bar', luckyNumber: 42 },
			{ bar: 'baz', luckyNumber: 17 },
			{ baz: undefined, luckyNumber: 42 },
		];

		expect(group(items, ({ luckyNumber }) => luckyNumber)).to.deep.equal([
			{ key: 42, items: [items[0], items[2]] },
			{ key: 17, items: [items[1]] },
		]);
	});

	it('should group items when using default comparison and multiple groups', () => {
		const items = [
			{ foo: 'bar', luckyNumbers: 42 },
			{ bar: 'baz', luckyNumbers: [17] },
			{ baz: undefined, luckyNumbers: [42, 17] },
		];

		expect(group(items, ({ luckyNumbers }) => luckyNumbers)).to.deep.equal([
			{ key: 42, items: [items[0], items[2]] },
			{ key: 17, items: [items[1], items[2]] },
		]);
	});

	it('should group items when using custom comparison and multiple groups', () => {
		const items = [
			{ foo: 'bar', luckyNumbers: 42 },
			{ bar: 'baz', luckyNumbers: [17] },
			{ baz: undefined, luckyNumbers: [2, 1] },
		];

		expect(
			group(
				items,
				({ luckyNumbers }) => luckyNumbers,
				(a, b) => a % 2 === b % 2,
			),
		).to.deep.equal([
			{ key: 42, items: [items[0], items[2]] },
			{ key: 17, items: [items[1], items[2]] },
		]);
	});
});

describe(entries.name, () => {
	it('should return object entries', () => {
		expect(entries({ foo: 'bar', bar: 'baz', baz: -1 })).to.deep.equal([
			['foo', 'bar'],
			['bar', 'baz'],
			['baz', -1],
		]);
	});
});

describe(sift.name, () => {
	it('should remove falsy items from array', () => {
		const d = new Date();
		expect(sift([null, 1, '', 'foo', undefined, d, false, [], 0])).to.deep.equal([1, 'foo', d, []]);
	});
});
