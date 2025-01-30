import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const secureId = (bytes = 32): string => randomBytes(bytes).toString('hex');

export const withTmpDir = async <T>(prefix: string, cb: (path: string) => T): Promise<T> => {
	const path = await mkdtemp(join(tmpdir(), prefix));

	try {
		return await cb(path);
	} finally {
		await rm(path, { recursive: true, force: true });
	}
};

export type Hashed<T> = { hash: string } & T;

/**
 * Compute hash for a string.
 *
 * @param input String to compute hash for.
 * @param algo Algorithm.
 */
export const computeHash = (input: string, algo = 'sha256'): string => {
	const hash = createHash(algo);
	hash.update(input);

	return hash.digest('hex');
};
