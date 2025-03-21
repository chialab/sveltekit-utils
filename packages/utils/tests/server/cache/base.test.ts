import { BaseCache } from '$lib/server/cache/base';
import { InMemoryCache } from '$lib/server/cache/in-memory';
import { asyncIterableToArray } from '$lib/utils/collections';
import { beforeEach, describe, expect, it } from 'vitest';

describe(BaseCache.name, () => {
	describe('remember', () => {
		const cache = InMemoryCache.init({});
		beforeEach(async () => {
			await cache.clear();
			await cache.set('foo', 'bar');
		});

		it('should return the pre-existing value', async () => {
			await expect(
				cache.remember('foo', () => {
					expect.unreachable();
				}),
			).resolves.equals('bar');
		});

		it('should generate and remember a missing value', async () => {
			await expect(cache.remember('bar', async () => 'new value')).resolves.equals('new value');
			await expect(cache.get('bar')).resolves.equals('new value');
			await expect(asyncIterableToArray(cache.keys())).resolves.to.has.members(['foo', 'bar']);
		});

		it('should generate and remember a missing value', async () => {
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
