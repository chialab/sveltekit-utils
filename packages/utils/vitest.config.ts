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
			projects: [
				{
					extends: true,
					test: {
						include: ['tests/**/*.{test,spec}.ts', '!tests/**/*.browser.{test,spec}.ts'],
						name: 'server',
						environment: 'node',
					},
				},
				{
					extends: true,
					test: {
						include: [
							'tests/**/*.{test,spec}.ts',
							'!tests/**/*.server.{test,spec}.ts',
							'!tests/server/**/*.{test,spec}.ts',
						],
						name: 'browser',
						browser: {
							enabled: true,
							provider: 'playwright',
							headless: true,
							screenshotFailures: false,
							instances: [{ browser: 'chromium' }],
						},
					},
				},
			],
		},
	}),
);
