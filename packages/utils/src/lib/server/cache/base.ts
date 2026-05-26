import { SpanKind } from '@opentelemetry/api';
import { timeout, type JitterFn, type JitterMode } from '../../utils/misc.js';
import type { StorageReadWriter } from '../storage.js';
import { ATTR_SERVICE_PEER_NAME, trace } from '../telemetry.js';

/**
 * Base class for caching.
 */
export abstract class BaseCache<V> implements StorageReadWriter<V> {
	readonly #inflight: Map<string, Promise<V | undefined>> = new Map();

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
	 * Flush cache removing all items matching a pattern.
	 *
	 * @param pattern Pattern to clear. May include the wildcard `*`.
	 */
	public abstract clearPattern(pattern: string): Promise<void>;

	protected cancelInflight(key: string | true): void {
		if (key === true) {
			this.#inflight.clear();
		} else {
			this.#inflight.delete(key);
		}
	}

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
		inflightTimeout?: number,
	): Promise<V>;
	remember(
		key: string,
		callback: () => PromiseLike<V | undefined>,
		ttl?: number | undefined,
		jitter?: JitterMode | JitterFn | undefined,
		inflightTimeout?: number,
	): Promise<V | undefined>;
	@trace({ kind: SpanKind.CLIENT, attributes: { [ATTR_SERVICE_PEER_NAME]: 'cache' } })
	public remember(
		key: string,
		callback: () => PromiseLike<V | undefined>,
		ttl?: number | undefined,
		jitter?: JitterMode | JitterFn | undefined,
		inflightTimeout = 60_000,
	): Promise<V | undefined> {
		const inflight = this.#inflight.get(key);
		if (inflight) {
			return inflight;
		}

		const valueDfd = (async () => {
			const cached = await this.get(key);
			if (cached !== undefined) {
				return cached;
			}

			const value = await callback();
			if (value !== undefined) {
				await this.set(key, value, ttl, jitter);
			}

			return value;
		})();
		this.#inflight.set(key, valueDfd);
		Promise.race([valueDfd, timeout(Math.max(1, inflightTimeout))])
			.catch(() => {})
			.finally(() => {
				const inflight = this.#inflight.get(key);
				if (inflight === valueDfd) {
					this.#inflight.delete(key);
				}
			});

		return valueDfd;
	}
}
