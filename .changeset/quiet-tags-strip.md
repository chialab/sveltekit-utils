---
"@chialab/sveltekit-utils": patch
---

Expose `./utils/*.js` entries, so single utils like `stripHtml` can be imported outside SvelteKit without pulling `@sveltejs/kit` and `$app/environment`
