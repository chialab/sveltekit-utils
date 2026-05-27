import { BaseCache } from '$lib/server/cache/base';
import { InMemoryCache } from '$lib/server/cache/in-memory';
import { asyncIterableToArray } from '$lib/utils/collections';
import { timeout } from '$lib/utils/misc';
import { beforeEach, describe, expect, it } from 'vitest';

describe(BaseCache.name, () => {
	describe('remember', () => {
		const cache = InMemoryCache.init({});
		beforeEach(async () => {
			await cache.clear();
			await cache.set('foo', 'bar');
		});

		it('should return the pre-existing value', async () => {
			await expect(cache.remember('foo', () => expect.unreachable())).resolves.equals('bar');
		});

		it('should generate and remember a missing value', async () => {
			await expect(cache.remember('bar', async () => 'new value')).resolves.equals('new value');
			await expect(cache.get('bar')).resolves.equals('new value');
			await expect(asyncIterableToArray(cache.keys())).resolves.to.has.members(['foo', 'bar']);
		});

		it('should return the same promise for concurrent requests', async () => {
			const firstPromise = cache.remember('bar', async () => 'new value');
			const secondPromise = cache.remember('bar', async () => expect.unreachable());

			await expect(firstPromise).resolves.equals('new value');
			await expect(secondPromise).resolves.equals('new value');
			await expect(cache.get('bar')).resolves.equals('new value');
			await expect(asyncIterableToArray(cache.keys())).resolves.to.has.members(['foo', 'bar']);

			const thirdPromise = cache.remember('bar', async () => expect.unreachable());

			await expect(thirdPromise).resolves.equals('new value');
			await expect(cache.get('bar')).resolves.equals('new value');
			await expect(asyncIterableToArray(cache.keys())).resolves.to.has.members(['foo', 'bar']);
		});

		it('should release inflight promise after timeout', async () => {
			const firstPromise = cache.remember('bar', async () => timeout(30, 'new value'), undefined, undefined, 10);
			await timeout(20);
			const secondPromise = cache.remember('bar', async () => 'another new value');

			await expect(firstPromise).resolves.equals('new value');
			await expect(secondPromise).resolves.equals('another new value');
			await expect(cache.get('bar')).resolves.equals('new value');
			await expect(asyncIterableToArray(cache.keys())).resolves.to.has.members(['foo', 'bar']);
		});

		it('should try to generate a missing value, but not remember it if undefined', async () => {
			await expect(cache.remember('bar', async () => undefined)).resolves.toBeUndefined();
			await expect(cache.get('bar')).resolves.toBeUndefined();
			await expect(asyncIterableToArray(cache.keys())).resolves.to.has.members(['foo']);
		});

		it('should re-throw any errors thrown by the callback', async () => {
			const reason = new Error('rejected because reasons');

			await expect(cache.remember('bar', () => Promise.reject(reason))).rejects.toThrow(reason);
			await expect(cache.get('bar')).resolves.toBeUndefined();
			await expect(asyncIterableToArray(cache.keys())).resolves.to.has.members(['foo']);
		});
	});
});
