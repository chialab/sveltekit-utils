/**
 * Infer type of items in an array.
 * @deprecated Use `T[number]` instead.
 */
export type ArrayItem<T> = Readonly<T> extends readonly (infer U)[] ? U : never;

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

/** Like {@see Object.entries}, but with less type pain. */
export const entries = <T extends Parameters<typeof Object.entries>[0]>(obj: T) =>
	Object.entries(obj) as [keyof T & string, T[keyof T & string]][];

/**
 * Remove all falsy values from an array and get rid of falsy types from the result of a `filter(Boolean)` call.
 * @param arr the array to be sifted.
 * @returns the sifted array.
 */
export const sift = <T>(arr: readonly T[]) => arr.filter(Boolean) as NonNullable<T>[];
