import { error } from '@sveltejs/kit';
import { readonly, writable, type Readable } from 'svelte/store';
import { logger } from './logger.js';

type MaybeFactory<T> = T | (() => T);

export type HttpsUrl = `https://${string}`;
export type ArrayItem<T> = Readonly<T> extends readonly (infer U)[] ? U : never;

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
	(additionalInfo: Record<string, unknown> = {}) =>
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
 * Provide user-friendly asynchronous loading for long-running promises.
 *
 * @param dfd Promise being waited.
 * @param showLoaderTimeout Time after which the loader should start showing.
 * @param hideLoaderTimeout Minimum time to display loader for after it started showing.
 * @returns An object with two keys:
 *   - `result`: a Promise that resolves as soon as `dfd` is resolved if `showLoaderTimeout` hasn't elapsed yet.
 *       After that time has elapsed, it won't resolve for at least `hideLoaderTimeout` ms.
 *   - `showLoader`: a Svelte readable store to display loader.
 * @example
 * ```svelte
 * <script lang="ts">
 * 	import { lazyLoad } from '@chialab/sveltekit-utils';
 *
 * 	const myLongRunningTask = start();
 * 	const { result, showLoader } = lazyLoad(myLongRunningTask, 300, 700);
 * </script>
 *
 * {#await result}
 * 	<!-- Note that we're await-ing `result` here, not `myLongRunningTask`! -->
 * 	{#if $showLoader}
 * 		Loading...
 * 	{/if}
 * {:then theResult}
 * 	Done! (display something useful here)
 * {:catch err}
 * 	Duh! It failed…
 * {/await}
 * ```
 */
export const lazyLoad = <T>(
	dfd: Promise<T>,
	showLoaderTimeout = 300,
	hideLoaderTimeout = 700,
): { result: Promise<T>; showLoader: Readable<boolean> } => {
	const showLoader = writable(false);
	const tookTooLong = Symbol('loading took too long, displaying loader');

	const result = Promise.race([dfd, timeout(showLoaderTimeout, tookTooLong)]).then((result) => {
		if (result !== tookTooLong) {
			return result;
		}

		showLoader.set(true);

		return Promise.all([dfd, timeout(hideLoaderTimeout, undefined)]).then(([result]) => {
			showLoader.set(false);

			return result;
		});
	});

	return { showLoader: readonly(showLoader), result };
};

/**
 * Get required parameters from a Map-like structure.
 *
 * @param params Map-like structure where parameters can be `get()` from.
 * @param requiredParams List of required parameters.
 * @example
 * ```ts
 * import { getRequiredParams } from '@chialab/sveltekit-utils';
 *
 * const { foo, bar } = getRequiredParams(url.searchParams, ['foo', 'bar']);
 * ```
 */
export const getRequiredParams = <T extends string>(
	params: { get(name: T): string | null | undefined },
	requiredParams: readonly T[],
): Record<T, string> => {
	const extracted = requiredParams.reduce<Partial<Record<T, string | null>>>(
		(store, name) => ({
			...store,
			[name]: params.get(name),
		}),
		{},
	);
	const missingParams = requiredParams.filter((name) => !extracted[name]);
	if (missingParams.length) {
		error(400, `The following mandatory parameters are missing or empty: ${missingParams.join(', ')}`);
	}

	return extracted as Record<T, string>;
};

/**
 * Sanitize HTML string by removing all tags and returning only text content.
 */
export const sanitizeHtml = (html: string | null | undefined): string => {
	const div = document.createElement('div');
	div.innerHTML = html ?? '';

	return div.innerText;
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

/** Identity function: checks if its parameter are identity-equal. */
const identity = (a: unknown, b: unknown) => a === b;

/**
 * Group an array of items using a property returned by the callback.
 *
 * @param items Items.
 * @param cb Callback used to group items together. It should return a "key" or an array of keys to assign the same item to multiple groups.
 * @param cmp Comparison function, used when key is not a scalar object thus comparison by strict equality would fail.
 * @example
 * ```ts
 * const groupedContents = group(
 * 	myContents,
 * 	(content) => content.someProperty ?? 'default'
 * );
 * // groupedContents = [{ key: 'foo', items: [content1, content2] }, { key: 'default', items: [content2, content4] }]
 *
 * const byCategory = group(
 * 	folder.children ?? [],
 * 	(obj) => obj.categories ?? [],
 * 	(a, b) => a.name === b.name,
 * );
 * // byCategory = [
 * // 	{ key: { name: 'cat-a', label: 'Category A' }, items: [obj1, obj2] },
 * // 	{ key: { name: 'cat-b', label: 'Category B' }, items: [obj1, obj3] },
 * // ]
 * ```
 */
export const group = <T, K>(
	items: T[],
	cb: (item: T) => K | K[],
	cmp: (a: K, b: K) => boolean = identity,
): { key: K; items: T[] }[] =>
	items.reduce<{ key: K; items: T[] }[]>((grouped, item) => {
		const keys = cb(item);
		for (const key of Array.isArray(keys) ? keys : [keys]) {
			const group = grouped.find((group) => cmp(group.key, key));
			if (!group) {
				grouped.push({ key, items: [item] });
			} else {
				group.items.push(item);
			}
		}

		return grouped;
	}, []);

/**
 * Execute multiple jobs in parallel with limited concurrency. This may be useful for fetching multiple resources without
 * flooding the server with an uncontrolled number of simultaneous requests.
 *
 * @param jobs Iterable of jobs. Ensure the promises are created just when the next iterable element is requested, or this is useless!
 * @param concurrency Number of jobs to maintain in pool.
 * @example
 * ```ts
 * // Fetch 30 pages, but keep number of simultaneous requests to 5 maximum.
 * const fetchPages = function* (): Iterable<Promise<Response>> {
 * 	for (let i = 1; i <= 30; i++) {
 * 		yield fetch(`/page/${i}`);
 * 	}
 * };
 * for await (const page of asyncIterablePool(fetchPages(), 5)) {
 * 	// Do stuff.
 * }
 * ```
 * @example
 * ```ts
 * // Fetch 30 pages, but keep number of simultaneous requests to 5 maximum.
 * const fetchPagesFactory = (): (() => Promise<Response>)[] =>
 * 	[...Array(30)].map((_, i) => () => fetch(`/page/${i + 1}`));
 * for await (const page of asyncIterablePool(fetchPages(), 5)) {
 * 	// Do stuff.
 * }
 *
 * // IMPORTANT: Note that this function makes all `fetch` start immediately once the function is called.
 * // This makes the `asyncIterablePool` useless as all the promises have already started!
 * // Either use an iterator AND MAKE SURE WORK STARTS ONLY WHEN THE NEXT ELEMENT IS REQUESTED
 * // (i.e. careful of `yield*`), or return an array of functions (factories) instead.
 * const fetchPages = (): Promise<Response>[] => [...Array(30)].map((_, i) => fetch(`/page/${i + 1}`));
 * ```
 */
export const asyncIterablePool = async function* <T>(
	jobs: Iterable<MaybeFactory<PromiseLike<T>>>,
	concurrency = 3,
): AsyncIterable<T> {
	const pool = new Map<symbol, PromiseLike<{ sym: symbol; val: T }>>();

	const first = () =>
		Promise.race(pool.values()).then(({ sym, val }) => {
			pool.delete(sym);

			return val;
		});

	for (const job of jobs) {
		const sym = Symbol('job');
		const startedJob = typeof job === 'function' ? job() : job;
		pool.set(
			sym,
			startedJob.then((val) => ({ sym, val })),
		);

		if (pool.size >= concurrency) {
			yield await first();
		}
	}

	while (pool.size) {
		yield await first();
	}
};

/**
 * Map an (async) iterator with a function. Same as {@see Array.prototype.map()} but for (async) iterators.
 * @param it Iterable.
 * @param map Mapping function.
 * @example
 * ```ts
 * import { timeout, mapIterator } from '@chialab/sveltekit-utils';
 *
 * function* myIt() {
 * 	yield 1;
 * 	yield 2;
 * 	yield 3;
 * }
 * async function* myAsyncIt() {
 * 	yield 1;
 * 	await timeout(100);
 * 	yield 2;
 * 	yield await timeout(200, 3);
 * }
 * const addItsIndex = mapIterator(
 * 	myIt(), // Can also be an async iterator: myAsyncIt(),
 * 	(value, idx) => value + index, // Can also be an async function: (value, idx) => timeout(100, value + index),
 * );
 * for await (const val of addItsIndex) {
 * 	console.log(val); // 1, 3, 5
 * }
 * ```
 */
export const mapIterator = async function* <T, K>(
	it: AsyncIterable<T> | Iterable<T>,
	map: (value: T, index: number) => K | PromiseLike<K>,
): AsyncGenerator<K, number, undefined> {
	let index = 0;
	for await (const val of it) {
		yield await map(val, index);
		index++;
	}

	return index;
};

/**
 * Get a random integer between two values.
 */
export const getRandomInt = (min: number, max: number): number =>
	Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min)) + Math.ceil(min));

/**
 * Check if a value is a Promise or Promise-like (i.e. has a `then()` method).
 */
export const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
	!!value && typeof (value as { then?: unknown }).then === 'function';

/**
 * Check if is a mobile device.
 */
export const isMobile = (): boolean =>
	// @ts-expect-error User Agent Data APIs are experimental.
	navigator.userAgentData?.mobile ??
	(/Android|webOS|iPhone|iPad|iPod|BlackBerry|Opera Mini/i.test(navigator.userAgent) ||
		'ontouchstart' in window ||
		navigator.maxTouchPoints > 0);

/** Like {@see Object.entries}, but with less type pain. */
export const entries = <T extends Parameters<typeof Object.entries>[0]>(obj: T) =>
	Object.entries(obj) as [keyof T & string, T[keyof T & string]][];

/**
 * Remove all falsy values from an array and get rid of falsy types from the result of a `filter(Boolean)` call.
 * @param arr the array to be sifted.
 * @returns the sifted array.
 */
export const sift = <T>(arr: readonly T[]) => arr.filter(Boolean) as NonNullable<T>[];
