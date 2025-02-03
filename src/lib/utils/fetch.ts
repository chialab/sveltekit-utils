import { error } from '@sveltejs/kit';
import type { Logger } from 'pino';
import { logger as defaultLogger } from '../logger.js';
import { timeout } from './misc.js';

/**
 * Handle errors from API requests.
 * @param additionalInfo Additional info that should be logged and might help with contextualizing the error.
 * @example
 * ```ts
 * const myFolder = await fetch('my-folder')
 * 	.catch(handleFetchError({ api: 'my-folder' }));
 * ```
 */
export const handleFetchError =
	(additionalInfo: Record<string, unknown> = {}, logger: Logger = defaultLogger) =>
	(err: unknown): never => {
		if (!(err instanceof Error && err.cause instanceof Response)) {
			logger.error({ err, ...additionalInfo }, 'Unknown error');

			throw err;
		}

		const status = err.cause.status;
		const headers = { ...err.cause.headers };
		if (status === 404) {
			logger.warn({ status, headers, ...additionalInfo }, 'Resource not found');

			error(404);
		}

		logger.error({ status, headers, ...additionalInfo }, 'Unexpected fetch error');

		throw err;
	};

export enum JitterMode {
	/** Do not apply jitter. */
	None = 'none',
	/** Full jitter: given _x_, a random value in the range _[0, x]_. */
	Full = 'full',
	/** Equal jitter: given _x_, a random value in the range _[x/2, x]_. */
	Equal = 'equal',
}
export type JitterFn = (value: number) => number;
const jitter = {
	[JitterMode.None]: (value) => value,
	[JitterMode.Full]: (value) => Math.random() * value,
	[JitterMode.Equal]: (value) => ((1 + Math.random()) * value) / 2,
} as const satisfies Record<JitterMode, JitterFn>;

/**
 * Create jitter function.
 *
 * @param mode Jitter mode, or custom jitter function.
 */
export const createJitter = (mode: JitterFn | JitterMode): JitterFn =>
	typeof mode === 'function' ? mode : (jitter[mode] ?? jitter[JitterMode.None]);

/**
 * Call a function and retry until it returns a value or the maximum number of attempts is reached, using "exponential backoff".
 *
 * @param factory Function to call.
 * @param baseMs Base delay in milliseconds.
 * @param capMs Maximum delay in milliseconds.
 * @param maxAttempts Maximum number of attempts.
 * @param jitterMode Jitter mode, or custom jitter function. By default, full jitter is used.
 */
export const backoffRetry = async <T>(
	factory: () => T | undefined | PromiseLike<T | undefined>,
	baseMs = 500,
	capMs = 10_000,
	maxAttempts: number = Infinity,
	jitterMode: JitterMode | JitterFn = JitterMode.Full,
): Promise<Awaited<T> | undefined> => {
	const jitter = createJitter(jitterMode);
	const sleep = (attempt: number) => jitter(Math.min(baseMs * 2 ** attempt, capMs));

	let attempt = 0;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const value = await factory();
		if (value !== undefined) {
			return value;
		}

		attempt++;
		if (attempt >= maxAttempts) {
			break;
		}

		await timeout(sleep(attempt));
	}

	return undefined;
};
