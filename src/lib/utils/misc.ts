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
