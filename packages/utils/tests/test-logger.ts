import type { Level } from 'pino';

class DebugTransport {
	#data: string[] = [];

	lastLevel?: Level = undefined;
	lastMsg?: string = undefined;
	lastObj?: unknown = undefined;
	lastTime?: number = undefined;

	get [Symbol.for('pino.metadata')]() {
		return true;
	}

	get writable() {
		return true;
	}

	write(datum: string): void {
		this.#data.push(datum);
	}
}

export const testTransportFactory = () => new DebugTransport();
