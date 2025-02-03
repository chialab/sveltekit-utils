import { getRandomInt, timeout } from '$lib/utils/misc';
import { describe, expect, it } from 'vitest';

describe(timeout.name, () => {
	it('should return void after the requested timeout', async () => {
		const start = Date.now();
		const result = await timeout(80);
		const end = Date.now();

		expect(end - start).to.be.approximately(80, 2);
		expect(result).to.equal(undefined);
	});

	it('should return the passed result after the timeout', async () => {
		const start = Date.now();
		const result = await timeout(120, { foo: 'bar' });
		const end = Date.now();

		expect(end - start).to.be.approximately(120, 2);
		expect(result).to.deep.equal({ foo: 'bar' });
	});
});

describe(getRandomInt.name, () => {
	it('should return a random int between 3 and 10', () => {
		expect(getRandomInt(3, 10)).to.be.within(3, 10);
	});

	it('should return a random int between 42 and 42', () => {
		expect(getRandomInt(42, 42)).to.be.within(42, 42);
	});

	it('should return a random int between 1 and 0', () => {
		expect(getRandomInt(1, 0)).to.be.within(0, 1);
	});
});
