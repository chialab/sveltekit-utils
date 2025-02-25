import { Sitemap, SitemapIndex } from '$lib/server/sitemap';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { xml2js } from 'xml-js';

const toBuf = (body: ReadableStreamReadResult<Uint8Array<ArrayBufferLike>>) => Buffer.from(body.value ?? []);

describe(Sitemap.name, () => {
	const baseUrl = new URL('https://www.example.com/');

	it('should throw an error when adding duplicate URLs if duplicates are not allowed', () => {
		const sitemap = new Sitemap(baseUrl);
		sitemap.append({ loc: '/foo' }, false);

		expect(() => sitemap.append({ loc: '/foo' }, false)).to.throw(
			'Location /foo had already been added to this sitemap: duplicate URLs are not allowed',
		);
		expect(() => sitemap.append({ loc: '/foo' }, true)).to.not.throw();
	});

	it('should build an empty sitemap', async () => {
		const sitemap = new Sitemap(baseUrl);

		const xml = sitemap.toString();
		const { elements } = xml2js(xml);
		expect(elements).deep.equal([
			{ attributes: { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' }, name: 'urlset', type: 'element' },
		]);

		const uncompressed = sitemap.toResponse(false);
		expect(uncompressed)
			.to.be.instanceOf(Response)
			.that.satisfies(
				(response: Response) =>
					response.headers.get('content-type') === 'application/xml' && !response.headers.has('content-encoding'),
			);
		await expect(uncompressed.body?.getReader().read())
			.to.be.a('promise')
			.that.resolves.satisfies(
				(body: ReadableStreamReadResult<Uint8Array<ArrayBufferLike>>) => toBuf(body)?.toString('utf8') === xml,
			);

		const compressed = sitemap.toResponse(true);
		expect(compressed)
			.to.be.instanceOf(Response)
			.that.satisfies(
				(response: Response) =>
					response.headers.get('content-type') === 'application/xml' &&
					response.headers.get('content-encoding') === 'gzip',
			);
		await expect(compressed.body?.getReader().read())
			.to.be.a('promise')
			.that.resolves.satisfies(
				(body: ReadableStreamReadResult<Uint8Array<ArrayBufferLike>>) =>
					toBuf(body).toString('utf8') !== xml && gunzipSync(toBuf(body)).toString('utf8') === xml,
			);
	});

	it('should build a sitemap with a few URLs', async () => {
		const sitemap = new Sitemap(baseUrl)
			.append({ loc: '/foo', changeFreq: 'daily' })
			.append({ loc: '/foo', priority: 42 })
			.append({ loc: '/bar' })
			.append({ loc: '/baz', changeFreq: 'monthly', priority: 1, lastMod: new Date('2025-01-01T00:00:00') });

		const xml = sitemap.toString();
		const { elements } = xml2js(xml);
		expect(elements).deep.equal([
			{
				attributes: { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' },
				name: 'urlset',
				type: 'element',
				elements: [
					{
						name: 'url',
						type: 'element',
						elements: [
							{ name: 'loc', type: 'element', elements: [{ type: 'text', text: 'https://www.example.com/foo' }] },
							{ name: 'changefreq', type: 'element', elements: [{ type: 'text', text: 'daily' }] },
						],
					},
					{
						name: 'url',
						type: 'element',
						elements: [
							{ name: 'loc', type: 'element', elements: [{ type: 'text', text: 'https://www.example.com/bar' }] },
						],
					},
					{
						name: 'url',
						type: 'element',
						elements: [
							{ name: 'loc', type: 'element', elements: [{ type: 'text', text: 'https://www.example.com/baz' }] },
							{ name: 'lastmod', type: 'element', elements: [{ type: 'text', text: '2025-01-01' }] },
							{ name: 'changefreq', type: 'element', elements: [{ type: 'text', text: 'monthly' }] },
							{ name: 'priority', type: 'element', elements: [{ type: 'text', text: '1.00' }] },
						],
					},
				],
			},
		]);

		const uncompressed = sitemap.toResponse(false);
		expect(uncompressed)
			.to.be.instanceOf(Response)
			.that.satisfies(
				(response: Response) =>
					response.headers.get('content-type') === 'application/xml' && !response.headers.has('content-encoding'),
			);
		await expect(uncompressed.body?.getReader().read())
			.to.be.a('promise')
			.that.resolves.satisfies(
				(body: ReadableStreamReadResult<Uint8Array<ArrayBufferLike>>) => toBuf(body)?.toString('utf8') === xml,
			);

		const compressed = sitemap.toResponse(true);
		expect(compressed)
			.to.be.instanceOf(Response)
			.that.satisfies(
				(response: Response) =>
					response.headers.get('content-type') === 'application/xml' &&
					response.headers.get('content-encoding') === 'gzip',
			);
		await expect(compressed.body?.getReader().read())
			.to.be.a('promise')
			.that.resolves.satisfies(
				(body: ReadableStreamReadResult<Uint8Array<ArrayBufferLike>>) =>
					toBuf(body).toString('utf8') !== xml && gunzipSync(toBuf(body)).toString('utf8') === xml,
			);
	});
});

describe(SitemapIndex.name, () => {
	const baseUrl = new URL('https://www.example.com/');

	it('should build an empty sitemap index', async () => {
		const sitemapIndex = new SitemapIndex(baseUrl);

		const xml = sitemapIndex.toString();
		const { elements } = xml2js(xml);
		expect(elements).deep.equal([
			{ attributes: { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' }, name: 'sitemapindex', type: 'element' },
		]);

		const uncompressed = sitemapIndex.toResponse(false);
		expect(uncompressed)
			.to.be.instanceOf(Response)
			.that.satisfies(
				(response: Response) =>
					response.headers.get('content-type') === 'application/xml' && !response.headers.has('content-encoding'),
			);
		await expect(uncompressed.body?.getReader().read())
			.to.be.a('promise')
			.that.resolves.satisfies(
				(body: ReadableStreamReadResult<Uint8Array<ArrayBufferLike>>) => toBuf(body)?.toString('utf8') === xml,
			);

		const compressed = sitemapIndex.toResponse(true);
		expect(compressed)
			.to.be.instanceOf(Response)
			.that.satisfies(
				(response: Response) =>
					response.headers.get('content-type') === 'application/xml' &&
					response.headers.get('content-encoding') === 'gzip',
			);
		await expect(compressed.body?.getReader().read())
			.to.be.a('promise')
			.that.resolves.satisfies(
				(body: ReadableStreamReadResult<Uint8Array<ArrayBufferLike>>) =>
					toBuf(body).toString('utf8') !== xml && gunzipSync(toBuf(body)).toString('utf8') === xml,
			);
	});

	it('should build a sitemap with a few URLs', async () => {
		const sitemapIndex = new SitemapIndex(baseUrl)
			.append({ loc: '/foo.xml' })
			.append({ loc: '/bar.xml', lastMod: new Date('2025-01-01T00:00:00') });

		const xml = sitemapIndex.toString();
		const { elements } = xml2js(xml);
		expect(elements).deep.equal([
			{
				attributes: { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' },
				name: 'sitemapindex',
				type: 'element',
				elements: [
					{
						name: 'sitemap',
						type: 'element',
						elements: [
							{ name: 'loc', type: 'element', elements: [{ type: 'text', text: 'https://www.example.com/foo.xml' }] },
						],
					},
					{
						name: 'sitemap',
						type: 'element',
						elements: [
							{ name: 'loc', type: 'element', elements: [{ type: 'text', text: 'https://www.example.com/bar.xml' }] },
							{ name: 'lastmod', type: 'element', elements: [{ type: 'text', text: '2025-01-01' }] },
						],
					},
				],
			},
		]);

		const uncompressed = sitemapIndex.toResponse(false);
		expect(uncompressed)
			.to.be.instanceOf(Response)
			.that.satisfies(
				(response: Response) =>
					response.headers.get('content-type') === 'application/xml' && !response.headers.has('content-encoding'),
			);
		await expect(uncompressed.body?.getReader().read())
			.to.be.a('promise')
			.that.resolves.satisfies(
				(body: ReadableStreamReadResult<Uint8Array<ArrayBufferLike>>) => toBuf(body)?.toString('utf8') === xml,
			);

		const compressed = sitemapIndex.toResponse(true);
		expect(compressed)
			.to.be.instanceOf(Response)
			.that.satisfies(
				(response: Response) =>
					response.headers.get('content-type') === 'application/xml' &&
					response.headers.get('content-encoding') === 'gzip',
			);
		await expect(compressed.body?.getReader().read())
			.to.be.a('promise')
			.that.resolves.satisfies(
				(body: ReadableStreamReadResult<Uint8Array<ArrayBufferLike>>) =>
					toBuf(body).toString('utf8') !== xml && gunzipSync(toBuf(body)).toString('utf8') === xml,
			);
	});
});
