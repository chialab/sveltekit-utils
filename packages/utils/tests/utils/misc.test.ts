import { backoffRetry, getRandomInt, JitterMode, timeout } from '$lib/utils/misc';
import { describe, expect, it } from 'vitest';

describe(timeout.name, { retry: 3 }, () => {
	it('should return void after the requested timeout', async () => {
		const start = Date.now();
		const result = await timeout(80);
		const end = Date.now();

		expect(end - start).to.be.approximately(80, 5);
		expect(result).to.equal(undefined);
	});

	it('should return the passed result after the timeout', async () => {
		const start = Date.now();
		const result = await timeout(120, { foo: 'bar' });
		const end = Date.now();

		expect(end - start).to.be.approximately(120, 5);
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

describe(backoffRetry.name, { retry: 3 }, () => {
	it('should immediately return the result if the function is successful', async () => {
		let count = 0;
		const factory = () => {
			count++;

			return 'foo';
		};

		await expect(backoffRetry(factory, 10, 50, 2)).resolves.to.equal('foo');
		expect(count).to.equals(1);
	});

	it('should retry if the function returns undefined', async () => {
		let count = 0;
		let stopwatch = Date.now();
		const laps: number[] = [];
		const factory = () => {
			count++;
			const now = Date.now();
			laps.push(now - stopwatch);
			stopwatch = now;

			return count > 2 ? 'foo' : undefined;
		};

		await expect(backoffRetry(factory, 10, 50, 3, JitterMode.None)).resolves.to.equal('foo');
		expect(count).to.equals(3);
		expect(laps).to.have.length(3);
		expect(laps[0]).to.be.approximately(0, 5);
		expect(laps[1]).to.be.approximately(10, 5);
		expect(laps[2]).to.be.approximately(20, 5);
	});

	it('should not wait longer than cap', async () => {
		let count = 0;
		let stopwatch = Date.now();
		const laps: number[] = [];
		const factory = () => {
			count++;
			const now = Date.now();
			laps.push(now - stopwatch);
			stopwatch = now;

			return count > 2 ? 'foo' : undefined;
		};

		await expect(backoffRetry(factory, 10, 15, 3, JitterMode.None)).resolves.to.equal('foo');
		expect(count).to.equals(3);
		expect(laps).to.have.length(3);
		expect(laps[0]).to.be.approximately(0, 5);
		expect(laps[1]).to.be.approximately(10, 5);
		expect(laps[2]).to.be.approximately(15, 5);
	});

	it('should not invoke the function more than max attempts times', async () => {
		let count = 0;
		let stopwatch = Date.now();
		const laps: number[] = [];
		const factory = () => {
			count++;
			const now = Date.now();
			laps.push(now - stopwatch);
			stopwatch = now;

			return undefined;
		};

		await expect(backoffRetry(factory, 10, 15, 2, JitterMode.None)).resolves.to.equal(undefined);
		expect(count).to.equals(2);
		expect(laps).to.have.length(2);
		expect(laps[0]).to.be.approximately(0, 5);
		expect(laps[1]).to.be.approximately(10, 5);
	});
});
