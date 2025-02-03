import type { JitterFn, JitterMode } from '../../utils/misc.js';

/**
 * Base class for caching.
 */
export abstract class BaseCache<V> {
	/**
	 * Read an item from the cache, if present.
	 *
	 * @param key Key.
	 */
	public abstract get(key: string): Promise<V | undefined>;

	/**
	 * Set an item in the cache.
	 *
	 * @param key Key.
	 * @param value Value to be stored.
	 * @param ttl Time-to-live, expressed as number of seconds from current time.
	 * @param jitter Jitter to apply to TTL. By default, no jittering is applied.
	 */
	public abstract set(
		key: string,
		value: V,
		ttl?: number | undefined,
		jitter?: JitterMode | JitterFn | undefined,
	): Promise<void>;

	/**
	 * Remove an item from cache.
	 *
	 * @param key Key.
	 */
	public abstract delete(key: string): Promise<void>;

	/**
	 * Iterate through keys in this cache.
	 *
	 * @param prefix List all keys under this prefix.
	 */
	public abstract keys(prefix?: string): AsyncIterator<string, void, never>;

	/**
	 * Flush cache removing all items.
	 *
	 * @param prefix Clear all keys under this prefix.
	 */
	public abstract clear(prefix?: string): Promise<void>;

	/**
	 * Read or set an item in the cache.
	 *
	 * @param key Key.
	 * @param callback Function that can be invoked to generate the value to then save to cache.
	 * @param ttl Time-to-live, expressed as number of seconds from current time.
	 * @param jitter Jitter to apply to TTL. By default, no jittering is applied.
	 */
	remember(
		key: string,
		callback: () => PromiseLike<V>,
		ttl?: number | undefined,
		jitter?: JitterMode | JitterFn | undefined,
	): Promise<V>;
	remember(
		key: string,
		callback: () => PromiseLike<V | undefined>,
		ttl?: number | undefined,
		jitter?: JitterMode | JitterFn | undefined,
	): Promise<V | undefined>;
	public async remember(
		key: string,
		callback: () => PromiseLike<V | undefined>,
		ttl?: number | undefined,
		jitter?: JitterMode | JitterFn | undefined,
	): Promise<V | undefined> {
		const cached = await this.get(key);
		if (typeof cached !== 'undefined') {
			return cached;
		}

		const value = await callback();
		if (typeof value !== 'undefined') {
			await this.set(key, value, ttl, jitter);
		}

		return value;
	}
}
