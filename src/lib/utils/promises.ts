import { readonly, writable, type Readable } from 'svelte/store';
import { timeout } from './misc.js';

type MaybeFactory<T> = T | (() => T);

/**
 * Check if a value is a Promise or Promise-like (i.e. has a `then()` method).
 */
export const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
	!!value && typeof (value as { then?: unknown }).then === 'function';

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
