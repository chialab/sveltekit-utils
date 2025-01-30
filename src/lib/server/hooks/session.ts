import type { Handle } from '@sveltejs/kit';
import { logger } from '../../logger.js';
import type { BaseCache } from '../cache/index.js';
import { Session, type SessionCookieOptions } from '../session.js';

export const buildSession =
	<T extends App.SessionData>(
		cache: BaseCache<Partial<T>>,
		cookieSettings: SessionCookieOptions,
		sessionTtl?: number,
	): Handle =>
	async ({ event, resolve }) => {
		const session = Session.init<T>(event.cookies, cookieSettings, cache)
			.then((session) => {
				logger.debug('Session data loaded');

				return session;
			})
			.catch((err) => {
				logger.error({ err }, 'Error loading session data');

				throw err;
			});
		event.locals.session = session;

		try {
			return await resolve(event);
		} finally {
			Session.persist(await session, cache, sessionTtl)
				.then(() => {
					logger.debug('Session data persisted');
				})
				.catch((err) => {
					logger.error({ err }, 'Error persisting session data');
				});
		}
	};
