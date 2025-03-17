# Tests

Tests are executed by [Vitest](https://vitest.dev/).

## Running tests

Tests can be run with `pnpm run test:unit`. Coverage can be generated with `pnpm run test:unit:coverage`.

## File names conventions

Tests are organised in a structure that recalls as closely as possible the structure of `src/lib/`.

Tests in files that end in `.browser.test.ts` are only executed in a browser environment (currently headless Chromium).

Tests in files in the `tests/server/` directory or that end in `.server.test.ts` are only executed in NodeJS.
