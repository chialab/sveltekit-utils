import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
	viteConfig,
	defineConfig({
		resolve: { conditions: ['browser'] },
		test: {
			coverage: {
				include: ['src/lib/**/*.ts'],
				reportsDirectory: './tests/coverage',
			},
		},
	}),
);
