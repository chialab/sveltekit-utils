// Schema parsers for `defineEnvVars` from `@sveltejs/kit/env`.
import { building } from '$app/env';

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
 */
export const requiredAtRuntime = (value: string | undefined): string => (building ? (value ?? '') : required(value));
