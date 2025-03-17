import { Session, type SessionData } from '$lib/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryCookies } from '../test-cookies';
import { InMemoryStorage } from '../test-storage';

describe(Session.name, () => {
	describe('with', () => {
		const cookies = new InMemoryCookies();
		const storage = new InMemoryStorage<Partial<SessionData>>();
		beforeEach(() => {
			cookies.clear();
			storage.clear();
		});

		it('should start a new session', async () => {
			expect.assertions(4);

			const result = Session.with(cookies, { name: 'FOO_SESSION', path: '/' }, storage, async (session) => {
				(await expect(session).resolves.instanceOf(Session)).and.satisfies(
					(session: Session<SessionData>) => session.dirty,
				);
				return (await session).id;
			});

			await expect(result).resolves.to.be.a('string');

			const sessionId = await result;
			expect(cookies.getAll()).has.deep.members([{ name: 'FOO_SESSION', value: sessionId }]);
			expect(storage.entries()).has.deep.members([[sessionId, {}]]);
		});

		it('should load an existing session', async () => {
			expect.assertions(4);

			cookies.set('FOO_SESSION', 'foobarbaz');
			storage.set('foobarbaz', { foo: 'bar', bar: ['hello world', 42] });

			const result = Session.with(cookies, { name: 'FOO_SESSION', path: '/' }, storage, async (session) => {
				(await expect(session).resolves.instanceOf(Session)).and.satisfies(
					(session: Session<SessionData>) =>
						!session.dirty && session.id === 'foobarbaz' && session.read('foo') === 'bar' && session.check('bar'),
				);
				return (await session).id;
			});

			await expect(result).resolves.equals('foobarbaz');
			expect(cookies.getAll()).has.deep.members([{ name: 'FOO_SESSION', value: 'foobarbaz' }]);
			expect(storage.entries()).has.deep.members([['foobarbaz', { foo: 'bar', bar: ['hello world', 42] }]]);
		});

		it('should recreate a new empty session when storage data is missing', async () => {
			expect.assertions(4);

			cookies.set('FOO_SESSION', 'foobarbaz');

			const result = Session.with(cookies, { name: 'FOO_SESSION', path: '/' }, storage, async (session) => {
				(await expect(session).resolves.instanceOf(Session)).and.satisfies(
					(session: Session<SessionData>) => session.dirty,
				);
				return (await session).id;
			});

			(await expect(result).resolves.to.be.a('string')).that.not.equals('foobarbaz');

			const sessionId = await result;
			expect(cookies.getAll()).has.deep.members([{ name: 'FOO_SESSION', value: sessionId }]);
			expect(storage.entries()).has.deep.members([[sessionId, {}]]);
		});

		it('should throw an error if reading from storage throws', async () => {
			expect.assertions(3);

			const readError = new Error('i cannot read');
			const storage = new (class extends InMemoryStorage<Partial<SessionData>> {
				get(): Promise<never> {
					throw readError;
				}
			})();

			cookies.set('FOO_SESSION', 'foobarbaz');

			const result = Session.with(cookies, { name: 'FOO_SESSION', path: '/' }, storage, () => {
				expect.unreachable();
			});

			await expect(result).rejects.toThrowError('Could not initialize session');

			expect(cookies.getAll()).has.deep.members([{ name: 'FOO_SESSION', value: 'foobarbaz' }]);
			expect(storage.entries()).has.deep.members([]);
		});

		it('should not throw if writing to storage throws', async () => {
			expect.assertions(4);

			const writeError = new Error('i cannot write');
			const storage = new (class extends InMemoryStorage<Partial<SessionData>> {
				set(): Promise<never> {
					throw writeError;
				}
			})();

			const result = Session.with(cookies, { name: 'FOO_SESSION', path: '/' }, storage, async (session) => {
				(await expect(session).resolves.instanceOf(Session)).and.satisfies(
					(session: Session<SessionData>) => session.dirty,
				);
				return (await session).id;
			});

			await expect(result).resolves.to.be.a('string');

			const sessionId = await result;
			expect(cookies.getAll()).has.deep.members([{ name: 'FOO_SESSION', value: sessionId }]);
			expect(storage.entries()).has.deep.members([]);
		});
	});

	describe('id', () => {
		let session: Session<SessionData>;
		beforeEach(() => {
			// @ts-expect-error We're deliberately using a private constructor here.
			session = new Session('foobarbaz', { foo: 'bar', bar: ['hello world', 42], baz: undefined });
		});

		it('should return session ID', () => {
			expect(session.id).equal('foobarbaz');
		});
	});

	describe('check', () => {
		let session: Session<SessionData>;
		beforeEach(() => {
			// @ts-expect-error We're deliberately using a private constructor here.
			session = new Session('foobarbaz', { foo: 'bar', bar: ['hello world', 42], baz: undefined });
		});

		it('should return true when key is set', () => {
			expect(session.check('foo')).equal(true);
			expect(session.dirty).equal(false);
		});

		it('should return false when key is present but undefined', () => {
			expect(session.check('baz')).equal(false);
			expect(session.dirty).equal(false);
		});

		it('should return false when key is not present', () => {
			expect(session.check('missing-key')).equal(false);
			expect(session.dirty).equal(false);
		});
	});

	describe('read', () => {
		let session: Session<SessionData>;
		beforeEach(() => {
			// @ts-expect-error We're deliberately using a private constructor here.
			session = new Session('foobarbaz', { foo: 'bar', bar: ['hello world', { answer: 42 }] });
		});

		it('should read value', () => {
			expect(session.read('foo')).equal('bar');
			expect(session.dirty).equal(false);
		});

		it('should return undefined when key is missing', () => {
			expect(session.read('baz')).toBeUndefined();
			expect(session.dirty).equal(false);
		});

		it('should return a deep copy of any object', () => {
			const bar = session.read('bar') as unknown[];
			expect(bar).deep.equal(['hello world', { answer: 42 }]);
			expect(session.dirty).equal(false);

			bar.push(false);
			expect(session.dirty).equal(false);
			expect(session.read('bar'))
				.deep.equals(['hello world', { answer: 42 }])
				.and.not.equals(bar);

			(bar[1] as any).answer = 43;
			(bar[1] as any).question = 'answer to everything + 1';
			expect(session.dirty).equal(false);
			expect(session.read('bar'))
				.deep.equals(['hello world', { answer: 42 }])
				.and.not.equals(bar);
		});
	});

	describe('write', () => {
		let session: Session<SessionData>;
		beforeEach(() => {
			// @ts-expect-error We're deliberately using a private constructor here.
			session = new Session('foobarbaz', { foo: 'bar' });
		});

		it('should overwrite value', () => {
			session.write('foo', 'BAR');

			expect(session.read('foo')).equal('BAR');
			expect(session.dirty).equal(true);
		});

		it('should create new key', () => {
			session.write('baz', 'whatever');
			expect(session.read('baz')).equal('whatever');
			expect(session.dirty).equal(true);
		});

		it('should create a deep copy of any object', () => {
			const bar: unknown[] = ['hello world', { answer: 42 }];
			session.write('bar', bar);

			expect(bar).deep.equal(['hello world', { answer: 42 }]);
			expect(session.dirty).equal(true);

			bar.push(false);
			expect(session.dirty).equal(true);
			expect(session.read('bar'))
				.deep.equals(['hello world', { answer: 42 }])
				.and.not.equals(bar);

			(bar[1] as any).answer = 43;
			(bar[1] as any).question = 'answer to everything + 1';
			expect(session.dirty).equal(true);
			expect(session.read('bar'))
				.deep.equals(['hello world', { answer: 42 }])
				.and.not.equals(bar);
		});
	});

	describe('delete', () => {
		let session: Session<SessionData>;
		beforeEach(() => {
			// @ts-expect-error We're deliberately using a private constructor here.
			session = new Session('foobarbaz', { foo: 'bar' });
		});

		it('should remove value', () => {
			session.delete('foo');

			expect(session.check('foo')).equal(false);
			expect(session.dirty).equal(true);
		});

		it('should silently ignore deleting a missing key', () => {
			session.delete('baz');
			expect(session.check('baz')).equal(false);
			expect(session.dirty).equal(true);
		});
	});

	describe('consume', () => {
		let session: Session<SessionData>;
		beforeEach(() => {
			// @ts-expect-error We're deliberately using a private constructor here.
			session = new Session('foobarbaz', { foo: 'bar' });
		});

		it('should read and delete value', () => {
			expect(session.consume('foo')).equal('bar');
			expect(session.check('foo')).equal(false);
			expect(session.dirty).equal(true);
		});

		it('should return undefined if value does not exist', () => {
			expect(session.consume('baz')).toBeUndefined();
			expect(session.check('baz')).equal(false);
			expect(session.dirty).equal(true);
		});
	});

	describe('remember', () => {
		let session: Session<SessionData>;
		beforeEach(() => {
			// @ts-expect-error We're deliberately using a private constructor here.
			session = new Session('foobarbaz', { foo: 'bar' });
		});

		it('should return existing value', async () => {
			await expect(
				session.remember('foo', () => {
					expect.unreachable();
				}),
			).resolves.equal('bar');
			expect(session.check('foo')).equal(true);
			expect(session.dirty).equal(false);
		});

		it('should generate and remember the new value when missing', async () => {
			const value = { answer: 42 };
			await expect(session.remember('bar', () => value)).resolves.equal(value);
			expect(session.check('bar')).equal(true);
			expect(session.dirty).equal(true);
			expect(session.read('bar')).not.equal(value);
			expect(session.read('bar')).deep.equal(value);
		});

		it('should reject with the same errors in the callback', async () => {
			const error = new Error('some error');
			await expect(session.remember('bar', () => Promise.reject(error))).rejects.throws(error);
			expect(session.check('bar')).equal(false);
			expect(session.dirty).equal(false);
		});
	});

	describe('clear', () => {
		let session: Session<SessionData>;
		beforeEach(() => {
			// @ts-expect-error We're deliberately using a private constructor here.
			session = new Session('foobarbaz', { foo: 'bar' });
		});

		it('should remove all values', () => {
			session.clear();

			expect(session.check('foo')).equal(false);
			expect(session.dirty).equal(true);
		});
	});
});
