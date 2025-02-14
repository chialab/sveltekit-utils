import type KVJS from '@heyputer/kv.js';
import { createRequire } from 'node:module';
import { createJitter, JitterMode, type JitterFn } from '../../utils/misc.js';
import { addPrefix, stripPrefix } from '../../utils/string.js';
import { BaseCache } from './base.js';

type InMemoryCacheOptions = { keyPrefix?: string; defaultTTL?: number; defaultJitter?: JitterMode | JitterFn };

// `import kvjs from '@heyputer/kv.js';` does not work!
// This module has side effects while loading that might cause build to fail.
const require = createRequire(import.meta.url);
const kvjs = require('@heyputer/kv.js') as new () => KVJS;

/** Simple cache with TTL and cap to maximum items stored. */
export class InMemoryCache<V> extends BaseCache<V> {
	readonly #options: InMemoryCacheOptions;
	readonly #inner: KVJS;

	public static init<V>(options: InMemoryCacheOptions): InMemoryCache<V> {
		return new this<V>(options);
	}

	private constructor(options: InMemoryCacheOptions, store?: KVJS) {
		super();

		this.#options = Object.freeze({ ...options });
		this.#inner = store ?? new kvjs();
	}

	public child<V2 extends V>(
		keyPrefix: string,
		options?: Partial<Omit<InMemoryCacheOptions, 'keyPrefix'>>,
	): InMemoryCache<V2> {
		return new InMemoryCache<V2>(
			{ ...this.#options, ...options, keyPrefix: addPrefix(this.#options.keyPrefix, keyPrefix) },
			this.#inner,
		);
	}

	public async get(key: string): Promise<V | undefined> {
		return this.#inner.get(addPrefix(this.#options.keyPrefix, key)) as V | undefined;
	}

	public async set(
		key: string,
		value: V,
		ttl?: number | undefined,
		jitter?: JitterMode | JitterFn | undefined,
	): Promise<void> {
		ttl ??= this.#options.defaultTTL;
		if (ttl === undefined) {
			this.#inner.set(addPrefix(this.#options.keyPrefix, key), value);

			return;
		}

		this.#inner.setex(
			addPrefix(this.#options.keyPrefix, key),
			value,
			createJitter(jitter ?? this.#options.defaultJitter ?? JitterMode.None)(ttl * 1000),
		);
	}

	public async delete(key: string): Promise<void> {
		this.#inner.del(addPrefix(this.#options.keyPrefix, key));
	}

	public async *keys(prefix?: string): AsyncGenerator<string, void, never> {
		yield* this.#inner
			.keys(addPrefix(this.#options.keyPrefix, `${prefix ?? ''}*`))
			.map((key) => stripPrefix(this.#options.keyPrefix, key)!);
	}

	public clear(prefix?: string): Promise<void> {
		return this.clearPattern((prefix ?? '') + '*');
	}

	public async clearPattern(pattern: string): Promise<void> {
		this.#inner.del(...this.#inner.keys(addPrefix(this.#options.keyPrefix, pattern)));
	}
}
