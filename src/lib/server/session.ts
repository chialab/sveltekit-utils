import type { Cookies } from '@sveltejs/kit';
import type { BaseCache } from './cache/index.js';
import { secureId } from './utils.js';
import { logger } from '../logger.js';

export type SessionData = Partial<Record<string, unknown>>;
export type SessionCookieOptions = Parameters<Cookies['set']>[2] & { name: string };

export class Session<T extends SessionData> {
	public static async init<T extends SessionData>(
		cookies: Cookies,
		cookieSettings: SessionCookieOptions,
		cache: BaseCache<Partial<T>>,
	): Promise<Session<T>> {
		const sessId = cookies.get(cookieSettings.name);
		if (!sessId) {
			const newSessId = secureId();
			logger.debug({ sessId: newSessId }, 'Initializing new session');
			cookies.set(cookieSettings.name, newSessId, cookieSettings);

			return new Session<T>(newSessId, {});
		}

		const data = await cache.get(sessId);
		if (typeof data === 'undefined') {
			const newSessId = secureId();
			logger.warn({ oldSessId: sessId, sessId: newSessId }, 'Missing session data, initializing new session');
			cookies.set(cookieSettings.name, newSessId, cookieSettings);

			return new Session<T>(newSessId, {});
		}

		logger.trace({ sessId }, 'Retrieved session data');

		return new Session<T>(sessId, data);
	}

	public static async persist<T extends SessionData>(
		session: Session<T>,
		cache: BaseCache<Partial<T>>,
		ttl?: number,
	): Promise<void> {
		logger.trace({ sessId: session.id }, 'Persisting session data');

		return cache.set(session.id, session.data, ttl);
	}

	constructor(
		protected readonly id: string,
		protected readonly data: Partial<T>,
	) {}

	public read<K extends keyof T>(key: K): T[K] | undefined {
		return this.data[key];
	}

	public check<K extends keyof T>(key: K): boolean {
		return typeof this.read(key) !== 'undefined';
	}

	public write<K extends keyof T>(key: K, value: T[K] | undefined): this {
		this.data[key] = value;

		return this;
	}

	public delete<K extends keyof T>(key: K): this {
		return this.write(key, undefined);
	}

	public clear(): this {
		for (const key in this.data) {
			delete this.data[key];
		}

		return this;
	}

	public consume<K extends keyof T>(key: K): T[K] | undefined {
		try {
			return this.read(key);
		} finally {
			this.delete(key);
		}
	}

	public async remember<K extends keyof T>(key: K, callback: () => T[K] | PromiseLike<T[K]>): Promise<T[K]> {
		const current = this.read(key);
		if (typeof current !== 'undefined') {
			return current;
		}

		const computed = await callback();
		this.write(key, computed);

		return computed;
	}
}
