import { destination, type Level } from 'pino';

const METADATA = Symbol.for('pino.metadata');

type PinoMetadata = ReturnType<typeof destination> & {
	[METADATA]: boolean;
	lastLevel?: Level;
	lastMsg?: string;
	lastObj?: unknown;
	lastTime?: number;
};

export const testTransportFactory = () => {
	const dest = destination('/dev/null') as PinoMetadata;
	dest[METADATA] = true;

	return dest;
};
