import { js2xml, type Element } from 'xml-js';
import { gzipSync } from 'node:zlib';

const xmlns = 'http://www.sitemaps.org/schemas/sitemap/0.9';

const formatDate = (date: Date): string =>
	[
		date.getFullYear().toString(10),
		(date.getMonth() + 1).toString(10).padStart(2, '0'),
		date.getDate().toString(10).padStart(2, '0'),
	].join('-');

const buildResponse = (xml: string, compress: boolean) => {
	const headers = {
		'Content-Type': 'application/xml',
	};
	if (!compress) {
		return new Response(xml, { headers });
	}

	return new Response(gzipSync(Buffer.from(xml)), {
		headers: { ...headers, 'Content-Encoding': 'gzip' },
	});
};

const textElem = (name: string, text: string): Element => ({
	type: 'element',
	name,
	elements: [{ type: 'text', text }],
});

export class Sitemap {
	readonly #baseUrl: URL;
	readonly #urls = new Map<string, Sitemap.Url>();

	constructor(baseUrl: URL) {
		this.#baseUrl = baseUrl;
	}

	public append(url: Sitemap.Url, ignoreDuplicate = true): this {
		const loc = new URL(url.loc, this.#baseUrl);
		const href = loc.href;
		if (!this.#urls.has(href)) {
			this.#urls.set(href, { ...url, loc });
		} else if (!ignoreDuplicate) {
			throw new Error(`Location ${url.loc} had already been added to this sitemap: duplicate URLs are not allowed`);
		}

		return this;
	}

	public toString(): string {
		return js2xml({
			declaration: { attributes: { version: '1.0', encoding: 'UTF-8' } },
			elements: [
				{
					type: 'element',
					name: 'urlset',
					attributes: { xmlns },
					elements: [...this.#urls.values()].map(({ loc, lastMod, changeFreq, priority }) => ({
						type: 'element',
						name: 'url',
						elements: [
							textElem('loc', loc.toString()),
							lastMod ? textElem('lastmod', formatDate(lastMod)) : undefined,
							changeFreq ? textElem('changefreq', changeFreq) : undefined,
							priority ? textElem('priority', Math.max(0, Math.min(priority, 1)).toFixed(2)) : undefined,
						].filter(Boolean),
					})),
				},
			],
		});
	}

	public toResponse(compress = false): Response {
		return buildResponse(this.toString(), compress);
	}
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Sitemap {
	export interface Url {
		loc: string | URL;
		lastMod?: Date;
		changeFreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
		priority?: number;
	}
}

export class SitemapIndex {
	readonly #baseUrl: URL;
	readonly #sitemaps: SitemapIndex.Sitemap[] = [];

	constructor(baseUrl: URL) {
		this.#baseUrl = baseUrl;
	}

	public append(sitemap: SitemapIndex.Sitemap): this {
		this.#sitemaps.push({
			...sitemap,
			loc: new URL(sitemap.loc, this.#baseUrl),
		});

		return this;
	}

	public toString(): string {
		return js2xml({
			declaration: { attributes: { version: '1.0', encoding: 'UTF-8' } },
			elements: [
				{
					type: 'element',
					name: 'sitemapindex',
					attributes: { xmlns },
					elements: this.#sitemaps.map(({ loc, lastMod }) => ({
						type: 'element',
						name: 'sitemap',
						elements: [
							textElem('loc', loc.toString()),
							lastMod ? textElem('lastmod', formatDate(lastMod)) : undefined,
						].filter(Boolean),
					})),
				},
			],
		});
	}

	public toResponse(compress = false): Response {
		return buildResponse(this.toString(), compress);
	}
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SitemapIndex {
	export interface Sitemap {
		loc: string | URL;
		lastMod?: Date;
	}
}
