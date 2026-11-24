import { flag, optional, required, requiredAtRuntime } from '#lib/utils/env.js';
import { describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ building: false }));
vi.mock('$app/env', () => ({
	get building() {
		return env.building;
	},
}));

describe(flag.name, () => {
	it('should parse truthy and falsy values', () => {
		expect(flag('1')).to.equal(true);
		expect(flag(' TRUE ')).to.equal(true);
		expect(flag('0')).to.equal(false);
		expect(flag('yes')).to.equal(false);
		expect(flag(undefined)).to.equal(false);
	});
});

describe(optional.name, () => {
	it('should trim values and default to an empty string', () => {
		expect(optional(' foo ')).to.equal('foo');
		expect(optional(undefined)).to.equal('');
	});
});

describe(required.name, () => {
	it('should trim values and reject missing or blank ones', () => {
		expect(required(' foo ')).to.equal('foo');
		expect(() => required(undefined)).to.throw('Value must not be empty');
		expect(() => required('   ')).to.throw('Value must not be empty');
	});
});

describe(requiredAtRuntime.name, () => {
	it('should skip the check only while building', () => {
		expect(requiredAtRuntime(' foo ')).to.equal('foo');
		expect(() => requiredAtRuntime(undefined)).to.throw('Value must not be empty');

		env.building = true;
		expect(requiredAtRuntime(undefined)).to.equal('');
		env.building = false;
	});
});
