/**
 * Add prefix to a string.
 * @param prefix Prefix.
 * @param value String.
 */
export const addPrefix = (prefix: string | undefined, value: string | undefined): string =>
	`${prefix ?? ''}${value ?? ''}`;

/**
 * Strip prefix from a string. If the string does not start with the requested prefix, returns `undefined`.
 * @param prefix Prefix.
 * @param value String.
 */
export const stripPrefix = (prefix: string | undefined, value: string): string | undefined => {
	if (!prefix) {
		return value;
	}

	if (!value.startsWith(prefix)) {
		return undefined;
	}

	return value.substring(prefix.length);
};
