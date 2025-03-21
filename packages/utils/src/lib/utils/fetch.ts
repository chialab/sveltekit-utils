import { error } from '@sveltejs/kit';
import type { Logger } from 'pino';
import { logger as defaultLogger } from '../logger.js';

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
		const headers = Object.fromEntries(err.cause.headers.entries());
		if (status === 404) {
			logger.warn({ status, headers, ...additionalInfo }, 'Resource not found');

			error(404);
		}

		logger.error({ status, headers, ...additionalInfo }, 'Unexpected fetch error');

		throw err;
	};
