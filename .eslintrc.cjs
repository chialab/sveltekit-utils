module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:svelte/recommended', 'prettier'],
	plugins: ['svelte', '@typescript-eslint'],
	overrides: [
		{
			files: ['*.svelte'],
			parser: 'svelte-eslint-parser',
			parserOptions: {
				parser: '@typescript-eslint/parser',
			},
			rules: {
				'svelte/no-at-html-tags': 'off',
			},
		},
		{
			files: ['*.ts', '*.svelte'],
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
	],
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
		extraFileExtensions: ['.svelte'],
	},
	env: {
		browser: true,
		es2017: true,
		node: true,
	},
};
