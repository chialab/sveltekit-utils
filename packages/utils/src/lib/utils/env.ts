// Schema parsers for `defineEnvVars` from `@sveltejs/kit/env`.

/**
 * Boolean flag parser
 */
export const flag = (value: string | undefined): boolean => ['1', 'true'].includes(value?.trim()?.toLowerCase() ?? '0');

/**
 * Optional string: missing values become an empty string
 */
export const optional = (value: string | undefined): string => value?.trim() ?? '';

/**
 * Required string: missing or blank values are rejected
 */
export const required = (value: string | undefined): string => {
	if (!value?.trim()) {
		throw new Error('Value must not be empty');
	}

	return value.trim();
};

/**
 * Required string, only enforced when the app runs.
 * @param value - The environment variable value to parse
 * @param building - Indicates if the app is currently building. Pass the `building` value from `$app/env`.
 */
export const requiredAtRuntime = (value: string | undefined, { building }: { building: boolean }): string =>
	building ? optional(value) : required(value);
