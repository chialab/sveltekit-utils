import { handleFetchError } from '$lib/utils/fetch';
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
