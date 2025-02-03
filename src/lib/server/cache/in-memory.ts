import { createJitter, JitterMode, type JitterFn } from '../../utils.js';
import { BaseCache } from './base.js';

type ValueWrapper<T> = { value: T; expire: number | undefined };

type InMemoryCacheOptions = {
	maxItems?: number;
	keyPrefix?: string;
	defaultTTL?: number;
	defaultJitter?: JitterMode | JitterFn;
};

/** Simple cache with TTL and cap to maximum items stored. */
export class InMemoryCache<V> extends BaseCache<V> {
	readonly #options: InMemoryCacheOptions;
	readonly #inner: Map<string, ValueWrapper<V>> = new Map();

	public static init<V>(options: InMemoryCacheOptions): InMemoryCache<V> {
		return new this<V>(options);
	}

	private constructor(options: InMemoryCacheOptions, map?: Map<string, ValueWrapper<V>>) {
		super();

		this.#options = Object.freeze({ ...options });
		this.#inner = map ?? new Map();
	}

	public child<V2 extends V>(
		keyPrefix: string,
		options?: Partial<Omit<InMemoryCacheOptions, 'keyPrefix'>>,
	): InMemoryCache<V2> {
		return new InMemoryCache<V2>(
			{
				...this.#options,
				...options,
				keyPrefix: this.#key(keyPrefix),
			},
			this.#inner as Map<`${typeof keyPrefix}${string}`, ValueWrapper<V2>>,
		);
	}

	public async get(key: string): Promise<V | undefined> {
		const cached = this.#inner.get(this.#key(key));
		if (typeof cached === 'undefined') {
			return undefined;
		}
		if (!InMemoryCache.#isValid(cached)) {
			this.#inner.delete(this.#key(key));

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
		const jitterFn = createJitter(jitter ?? this.#options.defaultJitter ?? JitterMode.None);
		this.#inner.set(this.#key(key), {
			value,
			expire: typeof ttl === 'number' ? Date.now() + jitterFn(ttl * 1000) : undefined,
		});

		this.#housekeeping();
	}

	public async delete(key: string): Promise<void> {
		this.#inner.delete(this.#key(key));
	}

	public async *keys(prefix?: string): AsyncGenerator<string, void, never> {
		for (const key of this.#inner.keys()) {
			const strippedKey = this.#stripPrefix(key);
			if (typeof strippedKey !== 'undefined' && strippedKey.startsWith(prefix ?? '')) {
				yield strippedKey;
			}
		}
	}

	public async clear(prefix?: string): Promise<void> {
		if (typeof prefix !== 'undefined') {
			this.#processBatch(this.#inner.entries(), (key) => key.startsWith(prefix));
		} else if (typeof this.#options.keyPrefix !== 'undefined') {
			this.#processBatch(this.#inner.entries(), () => true);
		} else {
			this.#inner.clear();
		}
	}

	/**
	 * Check if a cached value has expired.
	 *
	 * @param cached Cached value.
	 * @param now Point-in-time to evaluate expiration against.
	 */
	static #isValid(cached: ValueWrapper<unknown>, now?: number): boolean {
		if (typeof cached.expire !== 'number') {
			return true;
		}

		return cached.expire >= (now ?? Date.now());
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
						[...this.#inner.keys()].filter((key) => typeof this.#stripPrefix(key) !== 'undefined').length / // Number of items in this cache.
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

	#key(key: string | undefined) {
		return (this.#options.keyPrefix ?? '') + (key ?? '');
	}

	#stripPrefix(key: string) {
		const prefix = this.#options.keyPrefix ?? '';
		if (!key.startsWith(prefix)) {
			return undefined;
		}

		return key.substring(prefix.length);
	}

	#processBatch(
		iterator: IterableIterator<[string, ValueWrapper<V>]>,
		filter: (key: string, cached: ValueWrapper<V>) => boolean,
		batchSize = 1000,
	): void {
		for (let i = 0; i < batchSize; i++) {
			const next = iterator.next();
			if (next.done === true) {
				return;
			}

			const [key, cached] = next.value;
			const strippedKey = this.#stripPrefix(key);
			if (typeof strippedKey !== 'undefined' && filter(strippedKey, cached)) {
				this.#inner.delete(key);
			}
		}

		setImmediate(() => this.#processBatch(iterator, filter, batchSize));
	}
}
