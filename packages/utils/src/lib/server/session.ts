import type { Cookies } from '@sveltejs/kit';
import type { Logger } from 'pino';
import type { StorageReader, StorageReadWriter, StorageWriter } from './storage.js';
import { secureId } from './utils.js';

export type SessionData = Partial<Record<string, unknown>>;
export type SessionCookieOptions = Parameters<Cookies['set']>[2] & { name: string };

export class Session<T extends SessionData> {
	/** @deprecated Use {@see Session.with()} instead. */
	static async init<T extends SessionData>(
		cookies: Cookies,
		cookieSettings: SessionCookieOptions,
		storage: StorageReader<Partial<T>>,
	): Promise<Session<T>> {
		return this.#init(cookies, cookieSettings, storage);
	}

	/** @deprecated Use {@see Session.with()} instead. */
	static async persist<T extends SessionData>(session: Session<T>, storage: StorageWriter<Partial<T>>): Promise<void> {
		return this.#persist(session, storage);
	}

	/**
	 * Construct a new empty session object.
	 */
	static #newEmptySession<T extends SessionData>(): Session<T> {
		const session = new this<T>(secureId(), {});
		session.#dirty = true;
		session.#isNew = true;

		return session;
	}

	/**
	 * Initialize session for request.
	 * @param cookies Request cookies.
	 * @param cookieSettings Cookie settings.
	 * @param storage Session storage (usually cache).
	 * @param logger Logger instance.
	 */
	static async #init<T extends SessionData>(
		cookies: Cookies,
		cookieSettings: SessionCookieOptions,
		storage: StorageReader<Partial<T>>,
		logger?: Logger,
	): Promise<Session<T>> {
		try {
			const sessId = cookies.get(cookieSettings.name);
			if (!sessId) {
				const newSession = this.#newEmptySession<T>();
				logger?.debug({ sessId: newSession.id }, 'Initializing new session');
				cookies.set(cookieSettings.name, newSession.id, cookieSettings);

				return newSession;
			}

			const data = await storage.get(sessId);
			if (data === undefined) {
				const newSession = this.#newEmptySession<T>();
				logger?.warn({ oldSessId: sessId, sessId: newSession.id }, 'Missing session data, initializing new session');
				cookies.set(cookieSettings.name, newSession.id, cookieSettings);

				return newSession;
			}

			logger?.trace({ sessId }, 'Retrieved session data');

			return new this<T>(sessId, data);
		} catch (err) {
			logger?.error({ err }, 'Error loading session data');

			throw new Error('Could not initialize session', { cause: err });
		}
	}

	/**
	 * Persist session data.
	 * @param session Session object.
	 * @param storage Session storage (usually cache).
	 * @param logger Logger instance.
	 */
	static async #persist<T extends SessionData>(
		session: Session<T>,
		storage: StorageWriter<Partial<T>>,
		logger?: Logger,
	): Promise<void> {
		if (!session.#dirty) {
			return;
		}

		try {
			logger?.trace({ sessId: session.id }, 'Persisting session data');

			await storage.set(session.id, session.#data);
			session.#dirty = false;
			session.#isNew = false;

			logger?.debug('Session data persisted');
		} catch (err) {
			logger?.error({ err }, 'Failed to persist session data');

			return;
		}
	}

	/**
	 * Invoke a callback with session data to be loaded asynchronously.
	 * @param cookies Request cookies.
	 * @param cookieSettings Cookie settings.
	 * @param storage Session storage (usually cache).
	 * @param callback Callback to be invoked with session data.
	 * @param logger Logger instance.
	 */
	public static async with<T extends SessionData, R>(
		cookies: Cookies,
		cookieSettings: SessionCookieOptions,
		storage: StorageReadWriter<Partial<T>>,
		callback: (session: Promise<Session<T>>) => R | PromiseLike<R>,
		logger?: Logger,
	): Promise<R> {
		const session = this.#init(cookies, cookieSettings, storage, logger);

		try {
			return await callback(session);
		} finally {
			this.#persist(await session, storage, logger);
		}
	}

	/** Session ID. */
	#id: string;
	/** Session data. */
	#data: Partial<T>;
	/** Session state. */
	#dirty = false;
	/** Whether session is new. */
	#isNew = false;

	protected constructor(id: string, data: Partial<T>) {
		this.#id = id;
		this.#data = data;
	}

	/**
	 * Session ID.
	 */
	get id(): string {
		return this.#id;
	}

	/**
	 * Check if session is dirty and needs to be persisted.
	 */
	get dirty(): boolean {
		return this.#dirty;
	}

	/**
	 * Check if session is new (i.e. has just been initialized as opposed to restored via cookie).
	 */
	get isNew(): boolean {
		return this.#isNew;
	}

	/**
	 * Check if a key is set in session data.
	 * @param key Key.
	 */
	public check<K extends keyof T>(key: K): boolean {
		return key in this.#data && this.#data[key] !== undefined;
	}

	/**
	 * Read a key from session data.
	 * @param key Key.
	 */
	public read<K extends keyof T>(key: K): T[K] | undefined {
		return structuredClone(this.#data[key]);
	}

	/**
	 * Set a key in session data.
	 * @param key Key.
	 * @param value Value.
	 */
	public write<K extends keyof T>(key: K, value: T[K] | undefined): this {
		this.#data[key] = structuredClone(value);
		this.#dirty = true;

		return this;
	}

	/**
	 * Unset a key in session data.
	 * @param key Key.
	 */
	public delete<K extends keyof T>(key: K): this {
		delete this.#data[key];
		this.#dirty = true;

		return this;
	}

	/**
	 * Read and delete a key.
	 * @param key Key.
	 */
	public consume<K extends keyof T>(key: K): T[K] | undefined {
		try {
			return this.read(key);
		} finally {
			this.delete(key);
		}
	}

	/**
	 * Remember value in session data, providing a callback to generate the needed value if it's not already present.
	 * @param key Key.
	 * @param callback Callback to generate the value if it's not already present.
	 */
	public async remember<K extends keyof T>(key: K, callback: () => T[K] | PromiseLike<T[K]>): Promise<T[K]> {
		const current = this.read(key);
		if (current !== undefined) {
			return current;
		}

		const computed = await callback();
		this.write(key, computed);

		return computed;
	}

	/**
	 * Clear session data.
	 */
	public clear(): this {
		this.#data = {};
		this.#dirty = true;

		return this;
	}
}
