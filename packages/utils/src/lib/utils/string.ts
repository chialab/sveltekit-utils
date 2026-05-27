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

/**
 * Safely encode a string to base64, ensuring that the input is treated as UTF-8 and not ASCII.
 * @param str Input string.
 */
export const safeBase64Encode = (str: string): string => btoa(String.fromCharCode(...new TextEncoder().encode(str)));

/**
 * Safely decode a base64 string, ensuring that the output is treated as UTF-8 and not ASCII.
 * @param str Base64-encoded string.
 */
export const safeBase64Decode = (str: string): string | undefined => {
	try {
		return new TextDecoder().decode(Uint8Array.from(atob(str), (c) => c.charCodeAt(0)));
	} catch {
		return undefined;
	}
};
