import * as Pino from 'pino';
import { DEV } from 'esm-env';

const pino: typeof Pino.pino = typeof Pino === 'function' ? Pino : Pino.default;
export const logger: Pino.Logger = pino({
	transport: DEV ? { target: 'pino-pretty' } : undefined,
	level: DEV ? 'debug' : 'info',
});
