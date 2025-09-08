# @chialab/sveltekit-utils

## 0.1.0-alpha.12

### Patch Changes

- 87e9b31: Add `child` method to `S3` cache adapter.

## 0.1.0-alpha.11

### Minor Changes

- 6ab2ac7: Introducing a `S3` cache adapter.

## 0.1.0-alpha.10

### Patch Changes

- e7cfedb: Fix stripHtml method to remove style, script and iframe tags before extracting the text in the html.

## 0.1.0-alpha.9

### Patch Changes

- c58afd1: Rollback to patched version of `@heyputer/kv.js` since 0.1.91 does not include fixes of HeyPuter/kv.js#18.

## 0.1.0-alpha.8

### Patch Changes

- 59eab1c: Upgrade `@heyputer/kv.js` to latest version, fix keys never set in in-memory cache when ttl was non-zero and key did not exist.

## 0.1.0-alpha.7

### Patch Changes

- 291146c: Move `@chialab/isomorphic-dom` to production dependencies.

## 0.1.0-alpha.6

### Minor Changes

- 7d35776: Add support for `stripHtml` in NodeJS, decode HTML Entities.

## 0.1.0-alpha.5

### Patch Changes

- e15506a: Export fetch functions

## 0.1.0-alpha.4

### Patch Changes

- 69c18fe: Restore the store implementation for `lazyLoad` function

## 0.1.0-alpha.0

### Minor Changes

- 233eaca: Refactor to monorepo with configs and utils packages

## 0.1.0-alpha.2

### Patch Changes

- 3404b94: Use patched version of `@heyputer/kv.js`.

## 0.1.0-alpha.1

### Patch Changes

- 0f5cf47: Fix import of `@heyputer/kv.js`.

## 0.1.0-alpha.0

### Minor Changes

- e7760c7: Use `@heyputer/kv.js` for in-memory cache, simplify code and increase test coverage, add `clearPattern()` method to base cache interface.
- a094cf6: Avoid persisting session if nothing has changed.
- e002505: Add `asyncIterableToArray` sort-of polyfill.
- 8c506cb: Add minimal string utility methods.

### Patch Changes

- eeb87d7: Fix headers not being written to logs on fetch failures.

## 0.0.2

### Patch Changes

- 0042aa9: Enable isolated declarations for TypeScript.
