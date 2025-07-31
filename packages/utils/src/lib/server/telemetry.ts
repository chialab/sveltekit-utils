import api, { type Span, type SpanOptions, SpanStatusCode } from '@opentelemetry/api';

/**
 * Replaces deprecated SEMATTRS_PEER_SERVICE attribute.
 * See {@link https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md#unstable-semconv}.
 */
export const ATTR_PEER_SERVICE = 'peer.service' as const;

export const traceDecoratorFactory = (name: string, version?: string) => {
	const tracer = api.trace.getTracer(name, version);

	return <This, Value extends (this: This, ...args: any) => unknown>(options: SpanOptions = {}) =>
		(target: Value, ctx: ClassMethodDecoratorContext<This, Value>): Value => {
			type R = ReturnType<Value>;

			return function (this: This, ...args: Parameters<Value>): R {
				// @ts-expect-error Typing this properly would be cumbersome.
				const className = ctx.static ? this.name : this.constructor.name;

				return tracer.startActiveSpan([className, ctx.name].filter(Boolean).join('.'), options, (span: Span): R => {
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

						return result;
					} catch (err: unknown) {
						span.setStatus({ code: SpanStatusCode.ERROR });
						if (err instanceof Error) {
							span.recordException(err);
						}

						throw err;
					} finally {
						span.end();
					}
				});
			} as Value;
		};
};

/**
 * Decorator to trace a method or function by wrapping it in a new active span.
 */
export const trace = traceDecoratorFactory('@chialab/sveltekit-utils');
