/** @type {import('stylelint').Config} */
export default {
	extends: ['stylelint-config-standard', 'stylelint-config-html/svelte'],
	rules: {
		'selector-pseudo-class-no-unknown': [
			true,
			{
				ignorePseudoClasses: ['global'],
			},
		],
		'comment-empty-line-before': null,
		'declaration-block-single-line-max-declarations': 0,
		'import-notation': 'string',
		'media-feature-range-notation': 'prefix',
		'no-descending-specificity': null,
		'selector-class-pattern': '^([a-z][a-z0-9]*)(-{0,2}[a-z0-9]+)*$',
		'custom-property-pattern': '^([a-z][a-z0-9]*)(-{0,2}[a-z0-9]+)*$',
		'custom-property-empty-line-before': [
			'never',
			{
				ignore: ['after-comment'],
			},
		],
		'csstools/value-no-unknown-custom-properties': [true, { importFrom: ['./src/style.css'] }],
	},
	plugins: ['stylelint-value-no-unknown-custom-properties'],
};
