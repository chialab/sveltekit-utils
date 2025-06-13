import { BaseCache } from './base';
import {
	DeleteObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3,
	type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { logger } from '../../logger.js';
import { createJitter, JitterMode, type JitterFn } from '../../utils/misc.js';

type S3CacheOptions = {
	bucket: string;
	keyPrefix?: string;
	defaultTTL?: number;
	defaultJitter?: JitterMode | JitterFn;
};

export class S3Cache<V extends Uint8Array = Uint8Array> extends BaseCache<V> {
	readonly #options: S3CacheOptions;
	readonly #client: S3;

	public static init<V extends Uint8Array = Uint8Array>(
		s3Options: S3ClientConfig,
		options: S3CacheOptions,
	): S3Cache<V> {
		const client = new S3(s3Options);

		return new this(options, client);
	}

	private constructor(options: S3CacheOptions, client: S3) {
		super();

		this.#options = options;
		this.#client = client;
	}

	#buildKey(key: string): string {
		return `${this.#options.keyPrefix ?? ''}${key}`;
	}

	public async get(key: string): Promise<V | undefined> {
		const s3Key = this.#buildKey(key);
		try {
			const res = await this.#client.send(
				new GetObjectCommand({
					Bucket: this.#options.bucket,
					Key: s3Key,
				}),
			);

			const expiresAtStr = res.Metadata?.['expires-at'];
			if (expiresAtStr && Date.now() > Number.parseInt(expiresAtStr, 10)) {
				this.delete(key).catch((err) => {
					logger.error({ key, err }, 'Got error while trying to delete expired cache key');
				});
				return undefined;
			}

			if (!res.Body) {
				return undefined;
			}
			return res.Body.transformToByteArray() as Promise<V>;
		} catch {
			return undefined;
		}
	}

	public async set(
		key: string,
		value: V,
		ttl?: number | undefined,
		jitter?: JitterMode | JitterFn | undefined,
	): Promise<void> {
		const s3Key = this.#buildKey(key);

		try {
			let expiresAt: number | undefined;
			ttl = ttl ?? this.#options.defaultTTL;
			if (ttl !== undefined) {
				const jitterFn = createJitter(jitter ?? this.#options.defaultJitter ?? JitterMode.None);
				expiresAt = Date.now() + Math.round(jitterFn(ttl));
			}

			await this.#client.send(
				new PutObjectCommand({
					Bucket: this.#options.bucket,
					Key: s3Key,
					Body: value,
					Metadata: expiresAt ? { 'expires-at': `${expiresAt}` } : {},
				}),
			);
		} catch (err) {
			logger.error({ key, err }, 'Got error while trying to set cache key');
		}
	}

	public async delete(key: string): Promise<void> {
		await this.#client.send(
			new DeleteObjectCommand({
				Bucket: this.#options.bucket,
				Key: this.#buildKey(key),
			}),
		);
	}

	public async *keys(prefix?: string): AsyncIterableIterator<string> {
		const fullPrefix = this.#buildKey(prefix ?? '');
		let cont: string | undefined;
		do {
			const res = await this.#client.send(
				new ListObjectsV2Command({
					Bucket: this.#options.bucket,
					Prefix: fullPrefix,
					ContinuationToken: cont,
				}),
			);
			for (const obj of res.Contents ?? []) {
				if (obj.Key) {
					yield obj.Key.slice((this.#options.keyPrefix ?? '').length);
				}
			}
			cont = res.NextContinuationToken;
		} while (cont);
	}

	public async clear(prefix?: string): Promise<void> {
		const toDel: string[] = [];
		for await (const k of this.keys(prefix)) {
			toDel.push(this.#buildKey(k));
		}
		while (toDel.length) {
			const chunk = toDel.splice(0, 1000);
			await this.#client.send(
				new DeleteObjectsCommand({
					Bucket: this.#options.bucket,
					Delete: { Objects: chunk.map((Key) => ({ Key })) },
				}),
			);
		}
	}

	public async clearPattern(pattern: string): Promise<void> {
		const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const rx = new RegExp('^' + escapedPattern.replace(/\*/g, '.*') + '$');
		const toDel: string[] = [];
		for await (const k of this.keys()) {
			if (rx.test(k)) {
				toDel.push(this.#buildKey(k));
			}
		}
		while (toDel.length) {
			const chunk = toDel.splice(0, 1000);
			await this.#client.send(
				new DeleteObjectsCommand({
					Bucket: this.#options.bucket,
					Delete: { Objects: chunk.map((Key) => ({ Key })) },
				}),
			);
		}
	}
}
