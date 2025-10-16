import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		ignores: [
			'.DS_Store',
			'node_modules',
			'.svelte-kit',
			'build',
			'package',
			'dist',
			'public',
			'.env',
			'.env.*',
			'!.env.example',
			'.env.production',
			'.env.*.local',
			'*.log',
			'tests/coverage/',
			'vite.config.js.timestamp-*',
			'vite.config.ts.timestamp-*',
			'*.tsbuildinfo',
			'pnpm-lock.yaml',
			'.pnpm-cache',
			'package-lock.json',
			'yarn.lock',
		],
	},
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		rules: {
			'no-undef': 'off',
			'@typescript-eslint/ban-ts-comment': 'warn',
			'@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_|^\\$\\$', caughtErrorsIgnorePattern: '^_' },
			],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{ prefer: 'type-imports', disallowTypeAnnotations: false },
			],
		},
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
			},
		},
		rules: {
			'svelte/no-at-html-tags': 'off',
		},
	},
);
