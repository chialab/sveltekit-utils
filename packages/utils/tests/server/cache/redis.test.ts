import { RedisCache } from '$lib/server/cache/redis';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createServer, type AddressInfo } from 'node:net';
import { createClient } from 'redis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const hasRedisServer = spawnSync('redis-server', ['--version']).error === undefined;

if (!hasRedisServer) {
	console.warn('Skipping Redis cache tests: `redis-server` not found in PATH.');
}

const getFreePort = (): Promise<number> =>
	new Promise((resolve, reject) => {
		const server = createServer();
		server.on('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address() as AddressInfo;
			server.close(() => resolve(port));
		});
	});

type TestRedisClient = ReturnType<typeof createClient>;

const waitForRedis = async (url: string): Promise<TestRedisClient> => {
	for (let attempt = 0; attempt < 50; attempt++) {
		const client = createClient({ url });
		try {
			await client.connect();

			return client;
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	throw new Error(`Redis did not start at ${url}`);
};

describe.skipIf(!hasRedisServer)('RedisCache atomic primitives', () => {
	let server: ChildProcess;
	let url: string;
	let inspector: TestRedisClient;
	let first: RedisCache<number | string>;
	let second: RedisCache<number | string>;

	beforeAll(async () => {
		const port = await getFreePort();
		url = `redis://127.0.0.1:${port}`;
		server = spawn('redis-server', ['--port', String(port), '--save', '', '--appendonly', 'no'], {
			stdio: 'ignore',
		});
		inspector = await waitForRedis(url);

		first = RedisCache.init({ url }, {});
		second = RedisCache.init({ url }, {});
	});

	beforeEach(async () => {
		await inspector.flushDb();
	});

	afterAll(async () => {
		await first?.dispose();
		await second?.dispose();
		await inspector?.quit();
		server?.kill();
	});

	describe('increment', () => {
		it('should count exactly across two independent instances in parallel', async () => {
			await Promise.all(
				Array.from({ length: 200 }, () => [first.increment('counter'), second.increment('counter')]).flat(),
			);

			await expect(inspector.get('counter')).resolves.toBe('400');
		});

		it('should set the TTL only when the key is created', async () => {
			await first.increment('window', 2);
			await second.increment('window', 1000);

			const ttl = await inspector.ttl('window');
			expect(ttl).toBeGreaterThan(0);
			expect(ttl).toBeLessThanOrEqual(2);
		});
	});

	describe('setNx', () => {
		it('should let exactly one instance take the lock', async () => {
			const results = await Promise.all([first.setNx('lock', 'first', 10), second.setNx('lock', 'second', 10)]);

			expect(results.filter(Boolean)).toHaveLength(1);
			const winner = results[0] ? 'first' : 'second';
			await expect(inspector.get('lock')).resolves.toBe(winner);
			await expect(inspector.pTTL('lock')).resolves.toBeGreaterThan(0);
		});
	});

	describe('deleteIfEquals', () => {
		it('should release the lock only with the matching token', async () => {
			await first.setNx('lock', 'mine', 10);

			await expect(second.deleteIfEquals('lock', 'other')).resolves.toBe(false);
			await expect(inspector.get('lock')).resolves.toBe('mine');

			await expect(second.deleteIfEquals('lock', 'mine')).resolves.toBe(true);
			await expect(inspector.exists('lock')).resolves.toBe(0);
		});
	});

	describe('child', () => {
		it('should apply the scope prefix to all primitives', async () => {
			const scoped = first.child<number | string>('scope:');

			await expect(scoped.increment('counter', 3)).resolves.toBe(3);
			await expect(inspector.get('scope:counter')).resolves.toBe('3');
			await expect(inspector.exists('counter')).resolves.toBe(0);

			await expect(scoped.setNx('lock', 'token', 10)).resolves.toBe(true);
			await expect(inspector.get('scope:lock')).resolves.toBe('token');
			await expect(scoped.deleteIfEquals('lock', 'token')).resolves.toBe(true);
			await expect(inspector.exists('scope:lock')).resolves.toBe(0);
		});
	});
});
