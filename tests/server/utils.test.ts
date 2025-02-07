import { computeHash, secureId, withTmpDir } from '$lib/server/utils';
import { existsSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { describe, expect, it } from 'vitest';

describe(secureId.name, () => {
	const CASES = {
		'should generate a 32 bytes random hash': { bytes: 32, expectedLength: 64 },
		'should generate a 18 bytes random hash': { bytes: 18, expectedLength: 36 },
	} satisfies Record<string, { bytes: number; expectedLength: number }>;

	Object.entries(CASES).forEach(([label, { bytes, expectedLength }]) =>
		it(label, () => {
			expect(secureId(bytes)).to.be.a('string').with.length(expectedLength);
		}),
	);
});

describe(withTmpDir.name, () => {
	it('should create a temporary directory and remove it upon completion', async () => {
		expect.assertions(3);

		const expected = Symbol();
		let tmpDir: string | undefined = undefined;
		const result = withTmpDir('foo-', (path) => {
			tmpDir = path;
			expect(path)
				.to.be.a('string')
				.that.satisfies((path: string) => basename(path).startsWith('foo-'))
				.and.satisfies((path: string) => existsSync(path) && statSync(path).isDirectory());

			return expected;
		});

		await expect(result).resolves.equal(expected);

		expect(tmpDir).satisfy((path: string) => !existsSync(path));
	});

	it('should create a temporary directory and remove it after an error is thrown', async () => {
		expect.assertions(3);

		const expected = new Error('my error');
		let tmpDir: string | undefined = undefined;
		const result = withTmpDir('foo-', (path) => {
			tmpDir = path;
			expect(path)
				.to.be.a('string')
				.that.satisfies((path: string) => basename(path).startsWith('foo-'))
				.and.satisfies((path: string) => existsSync(path) && statSync(path).isDirectory());

			throw expected;
		});

		await expect(result).rejects.equal(expected);

		expect(tmpDir).satisfy((path: string) => !existsSync(path));
	});
});

describe(computeHash.name, () => {
	const CASES = {
		'should compute md5': {
			input: 'password',
			expected: '5f4dcc3b5aa765d61d8327deb882cf99',
			algorithm: 'md5',
		},
		'should compute sha1': {
			input: 'foo bar',
			expected: '3773dea65156909838fa6c22825cafe090ff8030',
			algorithm: 'sha1',
		},
		'should compute sha256': {
			input: 'hello world',
			expected: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
			algorithm: 'sha256',
		},
		'should compute sha512': {
			input: 'example string',
			expected:
				'f63ffbf293e2631e013dc2a0958f54f6797f096c36adda6806f717e1d4a314c0fb443ec71eec73cfbd8efa1ad2c709b902066e6356396b97a7ea5191de349012',
			algorithm: 'sha512',
		},
	} satisfies Record<string, { input: string; expected: string; algorithm: string }>;

	Object.entries(CASES).forEach(([label, { input, algorithm, expected }]) =>
		it(label, () => {
			expect(computeHash(input, algorithm)).equals(expected);
		}),
	);
});
