import api, { type Span, type SpanOptions, SpanStatusCode } from '@opentelemetry/api';

/**
 * Replaces deprecated SEMATTRS_PEER_SERVICE attribute.
 * See {@link https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md#unstable-semconv}.
 */
export const ATTR_PEER_SERVICE = 'peer.service' as const;

const readPath = (path: string, obj: any): string | number =>
	path.split('.').reduce((o, p) => (o ? (isNaN(+p) ? o[p] : o[parseInt(p, 10)]) : undefined), obj);

/**
 *
 * @param name
 * @param version
 */
export const traceDecoratorFactory = (name: string, version?: string) => {
	const tracer = api.trace.getTracer(name, version);

	return <This, Value extends (this: This, ...args: any) => unknown>(
			options: SpanOptions & { extra?: Record<string, string> } = {},
		) =>
		(target: Value, ctx: ClassMethodDecoratorContext<This, Value>): Value => {
			type R = ReturnType<Value>;

			return function (this: This, ...args: Parameters<Value>): R {
				// @ts-expect-error Typing this properly would be cumbersome.
				const className = ctx.static ? this.name : this.constructor.name;

				// Add argument values as extra attributes, using a simple dot-separated path to access nested arguments properties
				if (options.extra !== undefined) {
					options.attributes ||= {};
					for (const [attribute, path] of Object.entries(options.extra)) {
						options.attributes[attribute] = readPath(path, args);
					}
				}

				return tracer.startActiveSpan([className, ctx.name].filter(Boolean).join('.'), options, (span: Span): R => {
					// NOTE: do not use `finally` to call `span.end()` because it causes a double-call if `result` is a promise, and we can't await here otherwise the decorator becomes async
					try {
						const result = target.call(this, ...args) as R;
						if (result && typeof result === 'object' && 'then' in result && typeof result.then === 'function') {
							return result.then(
								(result: R) => {
									span.end();

									return result;
								},
								(err: unknown) => {
									span.setStatus({ code: SpanStatusCode.ERROR });
									if (err instanceof Error) {
										span.recordException(err);
									}
									span.end();

									throw err;
								},
							);
						}

						span.end();

						return result;
					} catch (err: unknown) {
						span.setStatus({ code: SpanStatusCode.ERROR });
						if (err instanceof Error) {
							span.recordException(err);
						}

						span.end();

						throw err;
					}
				});
			} as Value;
		};
};

/**
 * Decorator to trace a method or function by wrapping it in a new active span.
 *
 * @example
 * // Basic tracing.
 * @trace()
 * myFunction() { ... }
 * @example
 * // Custom attributes.
 * @trace({ kind: SpanKind.CLIENT, attributes: { [ATTR_PEER_SERVICE]: 'their-remote-service' } })
 * myFunction() { ... }
 * @example
 * // Use function parameter as custom attribute.
 * // This will add an attribute named "custom-attribute" with the 6th value in the "city" property of the first function parameter.
 * @trace({ kind: SpanKind.CLIENT, extra: { 'custom-attribute': '0.cities.5' } })
 * myFunction(param: { cities: string[] }) { ... }
 */
export const trace = traceDecoratorFactory('@chialab/sveltekit-utils');
