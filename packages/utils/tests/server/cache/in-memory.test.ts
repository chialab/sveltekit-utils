import { InMemoryCache } from '$lib/server/cache/in-memory';
import kvjs from '@heyputer/kv.js';
import { beforeEach, describe, expect, it } from 'vitest';

describe(InMemoryCache.name, () => {
	it('should create an in-memory cache', () => {
		expect(InMemoryCache.init({ defaultTTL: 200 })).to.be.an.instanceOf(InMemoryCache);
	});

	describe('child', () => {
		it('should create key-prefixed distinct caches', async () => {
			const base = InMemoryCache.init({});

			const foo = base.child('foo:');
			expect(foo).to.be.an.instanceOf(InMemoryCache);
			await expect(foo.set('answer', 42)).resolves.toBeUndefined();
			await expect(base.get('answer')).resolves.toBeUndefined();
			await expect(foo.get('answer')).resolves.equals(42);
			await expect(base.get('foo:answer')).resolves.equals(42);

			const bar = base.child('bar:');
			expect(bar).to.be.an.instanceOf(InMemoryCache);
			await expect(bar.set('answer', 'hello world')).resolves.toBeUndefined();
			await expect(base.get('answer')).resolves.toBeUndefined();
			await expect(bar.get('answer')).resolves.equals('hello world');
			await expect(base.get('bar:answer')).resolves.equals('hello world');
			await expect(foo.get('answer')).resolves.equals(42);
			await expect(base.get('foo:answer')).resolves.equals(42);

			await expect(base.clearPattern('*:answer')).resolves.toBeUndefined();
			await expect(foo.get('answer')).resolves.toBeUndefined();
			await expect(bar.get('answer')).resolves.toBeUndefined();
			await expect(base.get('foo:answer')).resolves.toBeUndefined();
			await expect(bar.get('bar:answer')).resolves.toBeUndefined();
		});
	});

	describe('get', () => {
		const store = new kvjs();
		// @ts-expect-error We're deliberately using a private constructor here.
		const cache = new InMemoryCache({ keyPrefix: 'foo:' }, store);

		beforeEach(() => {
			store.flushall();
			store.set('bar', 'hello');
			store.set('baz', 'world!');
			store.set('foo:bar', 'baz');
		});

		it('should return the correct value respecting prefix', async () => {
			await expect(cache.get('bar')).resolves.equals('baz');
		});

		it('should return undefined when the key is missing, respecting prefix', async () => {
			await expect(cache.get('baz')).resolves.toBeUndefined();
		});
	});

	describe('set', () => {
		const store = new kvjs();
		// @ts-expect-error We're deliberately using a private constructor here.
		const cache = new InMemoryCache({ keyPrefix: 'foo:' }, store);

		beforeEach(() => {
			store.flushall();
			store.set('bar', 'hello');
			store.set('baz', 'world!');
			store.set('foo:bar', 'baz');
		});

		it('should overwrite the correct value respecting prefix', async () => {
			await expect(cache.set('bar', 'foo bar!')).resolves.toBeUndefined();
			expect(store.keys('foo:*')).to.have.members(['foo:bar']);
			expect(store.keys('*')).to.have.members(['foo:bar', 'bar', 'baz']);
			expect(store.get('bar')).to.equals('hello');
			expect(store.get('foo:bar')).to.equals('foo bar!');
		});

		it('should create a new value respecting prefix', async () => {
			await expect(cache.set('baz', 'foo bar!')).resolves.toBeUndefined();
			expect(store.keys('foo:*')).to.have.members(['foo:bar', 'foo:baz']);
			expect(store.keys('*')).to.have.members(['foo:bar', 'foo:baz', 'bar', 'baz']);
			expect(store.get('baz')).to.equals('world!');
			expect(store.get('foo:baz')).to.equals('foo bar!');
		});
	});

	describe('delete', () => {
		const store = new kvjs();
		// @ts-expect-error We're deliberately using a private constructor here.
		const cache = new InMemoryCache({ keyPrefix: 'foo:' }, store);

		beforeEach(() => {
			store.flushall();
			store.set('bar', 'hello');
			store.set('baz', 'world!');
			store.set('foo:bar', 'baz');
		});

		it('should delete the correct value respecting prefix', async () => {
			await expect(cache.delete('bar')).resolves.toBeUndefined();
			expect(store.keys('foo:*')).to.not.have.members(['foo:bar']);
			expect(store.keys('*')).to.have.members(['bar', 'baz']);
			expect(store.get('bar')).to.equals('hello');
			expect(store.get('foo:bar')).toBeUndefined();
		});

		it('should silently ignore request to delete an inexistent key', async () => {
			await expect(cache.delete('baz')).resolves.toBeUndefined();
			expect(store.keys('foo:*')).to.have.members(['foo:bar']);
			expect(store.keys('*')).to.have.members(['foo:bar', 'bar', 'baz']);
			expect(store.get('baz')).to.equals('world!');
			expect(store.get('foo:baz')).toBeUndefined();
		});
	});

	describe('keys', () => {
		const store = new kvjs();
		// @ts-expect-error We're deliberately using a private constructor here.
		const cache = new InMemoryCache({ keyPrefix: 'foo:' }, store);

		beforeEach(() => {
			store.flushall();
			store.set('bar', 'hello');
			store.set('baz', 'world!');
			store.set('foo:bar', 'baz');
			store.set('foo:baz:1', 'one baz');
			store.set('foo:baz:2', 'two bazs');
			store.set('foo:baz:3', 'three bazs');
		});

		it('should list all the keys in the cache respecting the base prefix', async () => {
			const keys = [];
			for await (const key of cache.keys()) {
				keys.push(key);
			}

			expect(keys).to.have.members(['bar', 'baz:1', 'baz:2', 'baz:3']);
		});

		it('should list all the keys in the cache that have the requested prefix, including the base', async () => {
			const keys = [];
			for await (const key of cache.keys('baz:')) {
				keys.push(key);
			}

			expect(keys).to.have.members(['baz:1', 'baz:2', 'baz:3']);
		});
	});

	describe('clear', () => {
		const store = new kvjs();
		// @ts-expect-error We're deliberately using a private constructor here.
		const cache = new InMemoryCache({ keyPrefix: 'foo:' }, store);

		beforeEach(() => {
			store.flushall();
			store.set('bar', 'hello');
			store.set('baz', 'world!');
			store.set('foo:bar', 'baz');
			store.set('foo:baz:1', 'one baz');
			store.set('foo:baz:2', 'two bazs');
			store.set('foo:baz:3', 'three bazs');
		});

		it('should delete all keys in the cache', async () => {
			await expect(cache.clear()).resolves.toBeUndefined();
			expect(store.keys('foo:*')).to.have.members([]);
			expect(store.keys('*')).to.have.members(['bar', 'baz']);
		});

		it('should delete all keys in the cache with a requested prefix', async () => {
			await expect(cache.clear('baz:')).resolves.toBeUndefined();
			expect(store.keys('foo:*')).to.have.members(['foo:bar']);
			expect(store.keys('*')).to.have.members(['bar', 'baz', 'foo:bar']);
		});

		it('should silently ignore request to clear an inexistent prefix', async () => {
			await expect(cache.clear('non-existent-prefix:')).resolves.toBeUndefined();
			expect(store.keys('foo:*')).to.have.members(['foo:bar', 'foo:baz:1', 'foo:baz:2', 'foo:baz:3']);
			expect(store.keys('*')).to.have.members(['bar', 'baz', 'foo:bar', 'foo:baz:1', 'foo:baz:2', 'foo:baz:3']);
		});
	});

	describe('clearPattern', () => {
		const store = new kvjs();
		// @ts-expect-error We're deliberately using a private constructor here.
		const cache = new InMemoryCache({ keyPrefix: 'foo:' }, store);

		beforeEach(() => {
			store.flushall();
			store.set('bar', 'hello');
			store.set('baz', 'world!');
			store.set('foo:bar', 'baz');
			store.set('foo:baz:1', 'one baz');
			store.set('foo:baz:2', 'two bazs');
			store.set('foo:baz:3', 'three bazs');
		});

		it('should delete all keys in the cache', async () => {
			await expect(cache.clearPattern('*')).resolves.toBeUndefined();
			expect(store.keys('foo:*')).to.have.members([]);
			expect(store.keys('*')).to.have.members(['bar', 'baz']);
		});

		it('should delete all keys in the cache with the requested pattern', async () => {
			await expect(cache.clearPattern('baz:*')).resolves.toBeUndefined();
			expect(store.keys('foo:*')).to.have.members(['foo:bar']);
			expect(store.keys('*')).to.have.members(['bar', 'baz', 'foo:bar']);
		});

		it('should delete all keys in the cache with the requested  with multiple wildcards', async () => {
			await expect(cache.clearPattern('*:*')).resolves.toBeUndefined();
			expect(store.keys('foo:*')).to.have.members(['foo:bar']);
			expect(store.keys('*')).to.have.members(['bar', 'baz', 'foo:bar']);
		});

		it('should silently ignore request to clear an inexistent pattern', async () => {
			await expect(cache.clearPattern('non-existent-prefix:*')).resolves.toBeUndefined();
			expect(store.keys('foo:*')).to.have.members(['foo:bar', 'foo:baz:1', 'foo:baz:2', 'foo:baz:3']);
			expect(store.keys('*')).to.have.members(['bar', 'baz', 'foo:bar', 'foo:baz:1', 'foo:baz:2', 'foo:baz:3']);
		});
	});
});
