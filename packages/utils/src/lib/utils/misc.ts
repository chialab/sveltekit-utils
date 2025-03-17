/**
 * Return a Promise that resolves after exactly the requested timeout.
 *
 * @param ms Timeout in milliseconds after which Promise resolves.
 * @param result The value the Promise will resolve to.
 * @example
 * ```ts
 * doSomething();
 * await timeout(1500); // Sleep for 1.5s
 * doSomethingElse();
 * ```
 * @example
 * ```ts
 * const taskTimedOut = Symbol();
 * const { signal, abort } = new AbortController();
 * const result = await Promise.race([
 * 	fetch(someUrl, { signal }),
 * 	timeout(10_000, taskTimedOut),
 * ]);
 * if (result === taskTimedOut) {
 * 	abort();
 *
 * 	throw new Error('Fetch took more than 10s to complete, aborting');
 * }
 * ```
 */
export const timeout: {
	(ms: number): Promise<void>;
	<T>(ms: number, result: T): Promise<T>;
} = <T>(ms: number, result?: T): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(result as T), ms));

/**
 * Get a random integer between two values.
 */
export const getRandomInt = (min: number, max: number): number =>
	Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min)) + Math.ceil(min));

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
	while (true) {
		const value = await factory();
		if (value !== undefined) {
			return value;
		}

		attempt++;
		if (attempt >= maxAttempts) {
			break;
		}

		await timeout(sleep(attempt - 1));
	}

	return undefined;
};
