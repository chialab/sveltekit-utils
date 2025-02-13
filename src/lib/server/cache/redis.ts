import {
	createClient,
	createCluster,
	type RedisClientOptions,
	type RedisClientType,
	type RedisClusterOptions,
	type RedisClusterType,
	type RedisDefaultModules,
} from 'redis';
import { logger } from '../../logger.js';
import { createJitter, JitterMode, type JitterFn } from '../../utils/misc.js';
import { addPrefix, stripPrefix } from '../../utils/string.js';
import { BaseCache } from './base.js';

type RedisCacheOptions = {
	keyPrefix?: string;
	defaultTTL?: number;
	defaultJitter?: JitterMode | JitterFn;
};

type Jsonify<T> = T extends { toJSON(): infer U }
	? U
	: T extends Promise<unknown>
		? never
		: T extends object
			? { [k in keyof T]: Jsonify<T[k]> }
			: T;

type RedisClientOrCluster =
	| RedisClientType<RedisDefaultModules, Record<string, never>, Record<string, never>>
	| RedisClusterType<RedisDefaultModules, Record<string, never>, Record<string, never>>;
type RedisClientOrClusterOptions =
	| RedisClientOptions<RedisDefaultModules, Record<string, never>, Record<string, never>>
	| RedisClusterOptions<RedisDefaultModules, Record<string, never>, Record<string, never>>;

export class RedisCache<V> extends BaseCache<V | Jsonify<V>> {
	readonly #options: RedisCacheOptions;
	readonly #client: RedisClientOrCluster;
	#connectPromise?: Promise<unknown>;

	public static init<V>(redisOptions: RedisClientOrClusterOptions, options: RedisCacheOptions): RedisCache<V> {
		const client = 'rootNodes' in redisOptions ? createCluster(redisOptions) : createClient(redisOptions);

		return new this(options, client);
	}

	private constructor(options: RedisCacheOptions, client: RedisClientOrCluster) {
		super();

		this.#options = options;
		this.#client = client;

		const loggingInfo = {
			...this.#options,
			url: 'masters' in this.#client ? this.#client.masters.map(({ address }) => address) : this.#client.options?.url,
		};
		this.#client
			.on('ready', () => logger.info({ ...loggingInfo }, 'Connected to Redis'))
			.on('error', (err: Error) => logger.error({ err, ...loggingInfo }, 'Redis error'))
			.on('reconnecting', () => logger.warn({ ...loggingInfo }, 'Attempting re-connection to Redis'));
	}

	async #connect(): Promise<RedisClientOrCluster> {
		if (this.#connectPromise === undefined) {
			this.#connectPromise = this.#client.connect();
		}

		await this.#connectPromise;

		return this.#client;
	}

	public child<V2 extends V>(
		keyPrefix: string,
		options?: Partial<Omit<RedisCacheOptions, 'keyPrefix'>>,
	): RedisCache<V2> {
		return new RedisCache<V2>(
			{
				...this.#options,
				...options,
				keyPrefix: addPrefix(this.#options.keyPrefix, keyPrefix),
			},
			this.#client.duplicate(),
		);
	}

	public async get(key: string): Promise<Jsonify<V> | undefined> {
		const client = await this.#connect();
		const val = await client.get(addPrefix(this.#options.keyPrefix, key));
		if (val === null) {
			return undefined;
		}

		try {
			return JSON.parse(val) satisfies Jsonify<V>;
		} catch (err) {
			if (!(err instanceof SyntaxError)) {
				throw err;
			}

			logger.warn('Malformed JSON data');
			logger.debug({ val, key }, 'Could not parse JSON data stored in Redis cache');

			return undefined;
		}
	}

	public async set(
		key: string,
		value: V | Jsonify<V>,
		ttl?: number | undefined,
		jitter?: JitterMode | JitterFn | undefined,
	): Promise<void> {
		ttl ??= this.#options.defaultTTL;
		const client = await this.#connect();
		const val = JSON.stringify(value);
		try {
			if (ttl === undefined) {
				await client.set(addPrefix(this.#options.keyPrefix, key), val);
			} else {
				const jitterFn = createJitter(jitter ?? this.#options.defaultJitter ?? JitterMode.None);
				await client.setEx(addPrefix(this.#options.keyPrefix, key), Math.round(jitterFn(ttl)), val);
			}
		} catch (err) {
			logger.error({ key, err }, 'Got error while trying to set cache key');
		}
	}

	public async delete(key: string): Promise<void> {
		const client = await this.#connect();

		await client.del(addPrefix(this.#options.keyPrefix, key));
	}

	public async *keys(prefix?: string): AsyncGenerator<string, void, never> {
		const matchFilter = addPrefix(this.#options.keyPrefix, `${prefix ?? ''}*`);
		const client = await this.#connect();
		const clients = 'masters' in client ? client.masters.map(({ client }) => client!) : [client];
		for (const clientPromise of clients) {
			const client = await clientPromise;

			for await (const key of client.scanIterator({ MATCH: matchFilter })) {
				yield stripPrefix(this.#options.keyPrefix, key)!;
			}
		}
	}

	public clear(prefix?: string): Promise<void> {
		return this.clearPattern((prefix ?? '') + '*');
	}

	public async clearPattern(pattern: string): Promise<void> {
		const scanNode = async (client: RedisClientType) => {
			let cursor = 0;
			do {
				const res = await client.scan(cursor, { MATCH: addPrefix(this.#options.keyPrefix, pattern) });
				cursor = res.cursor;
				if (res.keys.length > 0) {
					await client.del(res.keys);
				}
			} while (cursor !== 0);
		};

		const client = await this.#connect();
		await Promise.all(
			'masters' in client ? client.masters.map(async ({ client }) => scanNode(await client!)) : [scanNode(client)],
		);
	}
}
