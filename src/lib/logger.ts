import * as Pino from 'pino';
import { dev } from '$app/environment';

const pino: typeof Pino.pino = typeof Pino === 'function' ? (Pino as any) : Pino.default;
export const logger: Pino.Logger = pino({
	transport: dev ? { target: 'pino-pretty' } : undefined,
	level: dev ? 'debug' : 'info',
});
