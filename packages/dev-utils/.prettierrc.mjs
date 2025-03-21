/** @type {import('prettier').Config} */
export default {
	"printWidth": 120,
	"tabWidth": 2,
	"useTabs": true,
	"semi": true,
	"singleQuote": true,
	"quoteProps": "consistent",
	"bracketSpacing": true,
	"bracketSameLine": false,
	"arrowParens": "always",
	"endOfLine": "auto",
	"plugins": ["prettier-plugin-svelte"],
	"overrides": [{ "files": "*.svelte", "options": { "parser": "svelte" } }]
};
