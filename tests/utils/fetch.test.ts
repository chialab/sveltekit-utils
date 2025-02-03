import { backoffRetry, handleFetchError, JitterMode } from '$lib/utils/fetch';
import { type HttpError, isHttpError } from '@sveltejs/kit';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { testTransportFactory } from '../test-logger';

describe(handleFetchError.name, () => {
	it('should translate a 404 response into a SvelteKit error', () => {
		const dest = testTransportFactory();
		const err = new Error('some error', {
			cause: new Response(null, { status: 404, headers: { 'Example-Header': 'some; value' } }),
		});

		expect(() => handleFetchError({ foo: 'bar' }, pino(dest))(err))
			.to.throw()
			.that.satisfies((err: unknown) => isHttpError(err))
			.and.satisfies((err: HttpError) => err.status === 404);

		expect(dest.lastLevel).to.equal(pino.levels.values['warn']);
		expect(dest.lastMsg).to.equal('Resource not found');
		expect(dest.lastObj).to.deep.equal({ status: 404, headers: { 'example-header': 'some; value' }, foo: 'bar' });
	});

	it('should re-throw an unknown error', () => {
		const dest = testTransportFactory();
		const err = { my: 'error' };

		expect(() => handleFetchError({ foo: 'bar' }, pino(dest))(err))
			.to.throw()
			.that.equals(err);

		expect(dest.lastLevel).to.equal(pino.levels.values['error']);
		expect(dest.lastMsg).to.equal('Unknown error');
		expect(dest.lastObj).to.deep.equal({ err, foo: 'bar' });
	});

	it('should re-throw non-404 fetch errors', () => {
		const dest = testTransportFactory();
		const err = new Error('some error', {
			cause: new Response(null, { status: 400, headers: { 'Example-Header': 'some; value' } }),
		});

		expect(() => handleFetchError({ foo: 'bar' }, pino(dest))(err))
			.to.throw()
			.that.equals(err);

		expect(dest.lastLevel).to.equal(pino.levels.values['error']);
		expect(dest.lastMsg).to.equal('Unexpected fetch error');
		expect(dest.lastObj).to.deep.equal({ status: 400, headers: { 'example-header': 'some; value' }, foo: 'bar' });
	});
});

describe(backoffRetry.name, () => {
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
		expect(laps[0]).to.be.approximately(0, 2);
		expect(laps[1]).to.be.approximately(10, 2);
		expect(laps[2]).to.be.approximately(20, 2);
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
		expect(laps[0]).to.be.approximately(0, 2);
		expect(laps[1]).to.be.approximately(10, 2);
		expect(laps[2]).to.be.approximately(15, 2);
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
		expect(laps[0]).to.be.approximately(0, 2);
		expect(laps[1]).to.be.approximately(10, 2);
	});
});
