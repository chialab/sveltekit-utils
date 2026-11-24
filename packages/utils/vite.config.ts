import babel from '@rolldown/plugin-babel';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({ preprocess: vitePreprocess(), adapter: adapter({ pages: 'public', assets: 'public' }) }),
		babel({
			presets: [
				{
					preset: () => ({ plugins: [['@babel/plugin-proposal-decorators', { version: '2023-11' }]] }),
					rolldown: { filter: { code: /@trace\b/ } },
				},
			],
		}),
	],
});
