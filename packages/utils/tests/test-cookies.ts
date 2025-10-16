import type { Cookies } from '@sveltejs/kit';

export class InMemoryCookies implements Cookies {
	#cookies = new Map<string, string>();

	get(name: string): string | undefined {
		return this.#cookies.get(name);
	}

	getAll(): Array<{ name: string; value: string }> {
		return [...this.#cookies.entries()].map(([name, value]) => ({ name, value }));
	}

	set(name: string, value: string): void {
		this.#cookies.set(name, value);
	}

	delete(name: string): void {
		this.#cookies.delete(name);
	}

	serialize(name: string, value: string): string {
		return `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
	}

	clear(): void {
		this.#cookies.clear();
	}
}
