import { createJitter, JitterMode, type JitterFn } from '../../utils/misc.js';
import { addPrefix, stripPrefix } from '../../utils/string.js';
import { BaseCache } from './base.js';

type InMemoryCacheOptions = {
	keyPrefix?: string;
	defaultTTL?: number;
	maxItems?: number;
	defaultJitter?: JitterMode | JitterFn;
};

interface StoredValue<V> {
	value: V;
	expiresAt?: number;
}

type StoredValueMap<V> = Map<string, StoredValue<V>>;

/** Simple cache with TTL and cap to maximum items stored. */
export class InMemoryCache<V> extends BaseCache<V> {
	readonly #options: InMemoryCacheOptions;
	readonly #inner: StoredValueMap<V>;

	public static init<V>(options: InMemoryCacheOptions): InMemoryCache<V> {
		return new this<V>(options);
	}

	private constructor(options: InMemoryCacheOptions, store?: StoredValueMap<V>) {
		super();

		this.#options = Object.freeze({ ...options });
		this.#inner = store ?? new Map();
	}

	public child<V2 extends V>(
		keyPrefix: string,
		options?: Partial<Omit<InMemoryCacheOptions, 'keyPrefix'>>,
	): InMemoryCache<V2> {
		return new InMemoryCache<V2>(
			{
				...this.#options,
				...options,
				keyPrefix: addPrefix(this.#options.keyPrefix, keyPrefix),
			},
			this.#inner as StoredValueMap<V2>,
		);
	}

	public async get(key: string): Promise<V | undefined> {
		const fullKey = addPrefix(this.#options.keyPrefix, key);
		const cached = this.#inner.get(fullKey);
		if (typeof cached === 'undefined') {
			return undefined;
		}

		if (!InMemoryCache.#isValid(cached)) {
			this.#inner.delete(fullKey);
			this.cancelInflight(key);

			return undefined;
		}

		return cached.value;
	}

	public async set(
		key: string,
		value: V,
		ttl?: number | undefined,
		jitter?: JitterMode | JitterFn | undefined,
	): Promise<void> {
		ttl ??= this.#options.defaultTTL;

		this.#inner.set(addPrefix(this.#options.keyPrefix, key), {
			value,
			expiresAt:
				ttl !== undefined
					? Date.now() + createJitter(jitter ?? this.#options.defaultJitter ?? JitterMode.None)(ttl * 1000)
					: undefined,
		});

		this.#housekeeping();
	}

	public async delete(key: string): Promise<void> {
		const fullKey = addPrefix(this.#options.keyPrefix, key);
		this.#inner.delete(fullKey);
		this.cancelInflight(key);

		this.#housekeeping();
	}

	public async *keys(prefix?: string): AsyncGenerator<string, void, undefined> {
		yield* this.#inner.entries().flatMap(([key, cached]) => {
			const stripped = stripPrefix(this.#options.keyPrefix, key);

			return stripped !== undefined && stripped.startsWith(prefix ?? '') && InMemoryCache.#isValid(cached)
				? [stripped]
				: [];
		});
	}

	public clear(prefix?: string): Promise<void> {
		return this.clearPattern(`${prefix ?? ''}*`);
	}

	public async clearPattern(pattern: string): Promise<void> {
		const matcher = new RegExp(
			`^${pattern
				.split('*')
				.map((part) => part.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&'))
				.join('.*')}$`,
		);
		for (const key of this.#inner.keys()) {
			const strippedKey = stripPrefix(this.#options.keyPrefix, key);
			if (strippedKey === undefined) {
				continue;
			}

			if (matcher.test(strippedKey)) {
				this.#inner.delete(key);
				this.cancelInflight(strippedKey);
			}
		}
	}

	/**
	 * Check if a cached value has expired.
	 *
	 * @param cached Cached value.
	 * @param now Point-in-time to evaluate expiration against.
	 */
	static #isValid(cached: StoredValue<unknown>, now?: number): boolean {
		if (typeof cached.expiresAt !== 'number') {
			return true;
		}

		return cached.expiresAt >= (now ?? Date.now());
	}

	/**
	 * Run housekeeping tasks on cache instance.
	 *
	 * Expired items will be removed, and if the cache is over capacity,
	 * excess items will be randomly evicted in an attempt to cut size down.
	 *
	 * @param batchSize Number of cache items to evaluate at every tick. Keep this low to avoid locking for too long.
	 */
	#housekeeping(batchSize = 1000): void {
		const now = Date.now();
		const dropProbability =
			typeof this.#options.maxItems !== 'undefined'
				? Math.max(
						0,
						[...this.#inner.keys()].filter((key) => key.startsWith(this.#options.keyPrefix ?? '')).length / // Number of items in this cache.
							this.#options.maxItems -
							1,
					)
				: 0;

		setImmediate(() =>
			this.#processBatch(
				this.#inner.entries(),
				(_, cached) => !InMemoryCache.#isValid(cached, now) || (dropProbability > 0 && Math.random() < dropProbability),
				batchSize,
			),
		);
	}

	#processBatch(
		iterator: IterableIterator<[string, StoredValue<V>]>,
		filter: (key: string, cached: StoredValue<V>) => boolean,
		batchSize = 1000,
	): void {
		for (let i = 0; i < batchSize; i++) {
			const next = iterator.next();
			if (next.done === true) {
				return;
			}

			const [key, cached] = next.value;
			const strippedKey = stripPrefix(this.#options.keyPrefix, key);
			if (typeof strippedKey !== 'undefined' && filter(strippedKey, cached)) {
				this.#inner.delete(key);
				this.cancelInflight(strippedKey);
			}
		}

		setImmediate(() => this.#processBatch(iterator, filter, batchSize));
	}
}
