# SvelteKit Utils

**SvelteKit Utils** is a collection of utilities and configurations to improve the development experience with [SvelteKit](https://kit.svelte.dev/).
There are actually 2 packages in this repository:
- @chialab/sveltekit-utils: A set of utility types and functions
- @chialab/sveltekit-dev-utils: A set of configurations (eslint, stylelint, prettier)

`sveltekit-dev-utils` package is meant to be used as a dev dependency, while `sveltekit-utils` is meant to be used as a dependency.

## Usage

Packages are distribuited as NPM packages through the official NPM registry.

### Install

You can use the `npm` cli or the `pnpm` package manager to install the package as a dependency:

```sh
npm install @chialab/sveltekit-utils
```

```sh
pnpm add @chialab/sveltekit-utils
```

```sh
npm install @chialab/sveltekit-dev-utils
```

```sh
pnpm add @chialab/sveltekit-dev-utils
```

`svelte-dev-utils` exports 3 config that you can use as follows:

For example for the eslint config create the `eslint.config.js` file in the root of your project and add the following:

```js
import cfg from '@chialab/sveltekit-dev-utils/eslint-config';

export default cfg;
```

You can extend the config as follows:

```js
import cfg from '@chialab/sveltekit-dev-utils/eslint-config';

export default [
	...cfg,
	{
		rules: {
			'no-console': 'off'
		}
	}
];
```

## License

**SvelteKit Utils** are released under the [MIT](https://github.com/chialab/sveltekit-utils/blob/main/LICENSE) license.