import type { Handle } from '@sveltejs/kit';
import type { Logger } from 'pino';
import { Session, type SessionCookieOptions } from '../session.js';
import type { StorageReadWriter } from '../storage.js';

export const buildSession =
	<T extends App.SessionData>(
		storage: StorageReadWriter<Partial<T>>,
		cookieSettings: SessionCookieOptions,
		logger?: Logger,
	): Handle =>
	({ event, resolve }) =>
		Session.with(
			event.cookies,
			cookieSettings,
			storage,
			(session) => {
				event.locals.session = session;

				return resolve(event);
			},
			logger,
		);
