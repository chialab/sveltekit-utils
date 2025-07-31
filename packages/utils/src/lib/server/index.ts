export * from './cache/index.js';
export * from './hooks/index.js';
export * from './session.js';
export * from './sitemap.js';
export { traceDecoratorFactory, ATTR_PEER_SERVICE } from './telemetry.js';
export * from './utils.js';

import type { Session } from './session.js';
import type { Hashed } from './utils.js';

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace App {
		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		interface UserInfo {}
		interface SessionData {
			hashedInfo: Hashed<{ userInfo: UserInfo }>;

			[K: string]: unknown;
		}
		interface Locals {
			userInfo?: Promise<UserInfo | undefined>;
			session: Promise<Session<SessionData>>;
		}
	}
}
