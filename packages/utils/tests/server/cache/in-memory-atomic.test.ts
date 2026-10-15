import { InMemoryCache } from '$lib/server/cache/in-memory';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('InMemoryCache atomic primitives', () => {
	let cache: InMemoryCache<number | string>;

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
		cache = InMemoryCache.init({});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('increment', () => {
		it('should increment from zero by one by default', async () => {
			await expect(cache.increment('counter')).resolves.toBe(1);
			await expect(cache.increment('counter')).resolves.toBe(2);
			await expect(cache.get('counter')).resolves.toBe(2);
		});

		it('should increment by the requested amount', async () => {
			await expect(cache.increment('counter', 5)).resolves.toBe(5);
			await expect(cache.increment('counter', -2)).resolves.toBe(3);
		});

		it('should set the TTL only when the key is created', async () => {
			await cache.increment('window', 1, 2);
			vi.advanceTimersByTime(1500);
			await expect(cache.increment('window', 1, 1000)).resolves.toBe(2);

			vi.advanceTimersByTime(1000);
			await expect(cache.get('window')).resolves.toBeUndefined();
			await expect(cache.increment('window', 1, 2)).resolves.toBe(1);
		});

		it('should throw when the key holds a non-numeric value', async () => {
			await cache.set('text', 'hello');
			await expect(cache.increment('text')).rejects.toThrow();
		});
	});

	describe('setNx', () => {
		it('should set the key only if it does not exist', async () => {
			await expect(cache.setNx('lock', 'first', 1)).resolves.toBe(true);
			await expect(cache.setNx('lock', 'second', 1)).resolves.toBe(false);
			await expect(cache.get('lock')).resolves.toBe('first');
		});

		it('should allow taking the key again once it expired', async () => {
			await expect(cache.setNx('lock', 'first', 1)).resolves.toBe(true);
			vi.advanceTimersByTime(1001);
			await expect(cache.setNx('lock', 'second', 1)).resolves.toBe(true);
			await expect(cache.get('lock')).resolves.toBe('second');
		});
	});

	describe('deleteIfEquals', () => {
		it('should not delete when the value differs', async () => {
			await cache.setNx('lock', 'mine', 10);
			await expect(cache.deleteIfEquals('lock', 'other')).resolves.toBe(false);
			await expect(cache.get('lock')).resolves.toBe('mine');
		});

		it('should delete when the value matches', async () => {
			await cache.setNx('lock', 'mine', 10);
			await expect(cache.deleteIfEquals('lock', 'mine')).resolves.toBe(true);
			await expect(cache.get('lock')).resolves.toBeUndefined();
		});

		it('should return false for a missing or expired key', async () => {
			await expect(cache.deleteIfEquals('missing', 'x')).resolves.toBe(false);

			await cache.setNx('lock', 'mine', 1);
			vi.advanceTimersByTime(1001);
			await expect(cache.deleteIfEquals('lock', 'mine')).resolves.toBe(false);
		});
	});

	describe('child', () => {
		it('should apply the scope prefix to keys', async () => {
			const scoped = cache.child<number | string>('scope:');

			await expect(scoped.increment('counter', 3)).resolves.toBe(3);
			await expect(cache.get('scope:counter')).resolves.toBe(3);
			await expect(cache.get('counter')).resolves.toBeUndefined();

			await expect(scoped.setNx('lock', 'token', 10)).resolves.toBe(true);
			await expect(cache.get('scope:lock')).resolves.toBe('token');
			await expect(scoped.deleteIfEquals('lock', 'token')).resolves.toBe(true);
			await expect(cache.get('scope:lock')).resolves.toBeUndefined();
		});
	});
});
