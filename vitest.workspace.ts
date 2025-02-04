import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
	{
		extends: './vitest.config.ts',
		test: {
			include: ['tests/**/*.{test,spec}.ts', '!tests/**/*.browser.{test,spec}.ts', '!tests/**/browser.{test,spec}.ts'],
			name: 'server',
			environment: 'node',
		},
	},
	{
		extends: './vitest.config.ts',
		test: {
			include: ['tests/**/*.{test,spec}.ts', '!tests/**/*.server.{test,spec}.ts'],
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
]);
