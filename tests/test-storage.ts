import type { StorageReadWriter } from '$lib/server/storage';

export class InMemoryStorage<T> implements StorageReadWriter<T> {
	#map = new Map<string, T>();

	async get(key: string): Promise<T | undefined> {
		return this.#map.get(key);
	}

	async set(key: string, value: T): Promise<void> {
		this.#map.set(key, value);
	}

	async delete(key: string): Promise<void> {
		this.#map.delete(key);
	}

	entries(): [string, T][] {
		return [...this.#map.entries()];
	}

	clear(): void {
		this.#map.clear();
	}
}
