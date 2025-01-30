/**
 * Check if URL is "internal" relative to a base URL.
 *
 * @param url URL to check.
 * @param base Base URL relative to which the first argument should be considered "internal".
 */
export const isInternalUrl = (url: URL | string, base: URL | string): boolean =>
	new URL(url, base).origin === new URL(base).origin;

type StringableSearchParam = string | number;
type SearchParamStruct =
	| StringableSearchParam
	| readonly SearchParamStruct[]
	| { [x: string]: SearchParamStruct }
	| undefined;

export type EncodableQueryParams = Record<string, SearchParamStruct>;
type FlattenedQueryParams = [string, string | undefined][];

const recursiveFlattener = (params: SearchParamStruct, prefix: string): FlattenedQueryParams => {
	if (params === undefined || params === null) {
		return [[prefix, undefined]];
	}

	if (typeof params === 'string' || typeof params === 'number') {
		return [[prefix, `${params}`]];
	}

	const items: [string, SearchParamStruct][] = Array.isArray(params)
		? params.map((param, i) => [`${i}`, param])
		: Object.entries(params);

	return items.reduce<FlattenedQueryParams>(
		(store, [key, param]) => [...store, ...recursiveFlattener(param, `${prefix}[${key}]`)],
		[],
	);
};

const flattenQueryParams = (params: EncodableQueryParams): FlattenedQueryParams =>
	Object.entries(params).reduce<FlattenedQueryParams>(
		(store, [key, param]) => [...store, ...recursiveFlattener(param, key)],
		[],
	);

/**
 * Build URL search params.
 *
 * @param params Query parameters to serialize.
 */
export const buildURLSearchParams = (params: EncodableQueryParams): URLSearchParams =>
	new URLSearchParams(flattenQueryParams(params).filter((param): param is [string, string] => param[1] !== undefined));

/**
 * Modify an URL setting the requested query parameters.
 *
 * @param base Base URL.
 * @param params Query parameters to set (or unset).
 * @param merge Merge the passed query parameters into the existing ones (set to `false` to overwrite).
 */
export const withQueryParams = (base: URL | string, params: EncodableQueryParams, merge: boolean = true): URL => {
	const url = new URL(base);
	if (!merge) {
		url.search = '';
	}

	flattenQueryParams(params).forEach(([key, value]) =>
		value !== undefined ? url.searchParams.set(key, value) : url.searchParams.delete(key),
	);

	return url;
};
