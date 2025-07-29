import api, { type Span, type SpanOptions, SpanStatusCode } from '@opentelemetry/api';

/**
 * Replaces deprecated SEMATTRS_PEER_SERVICE attribute.
 * See {@link https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md#unstable-semconv}.
 */
export const ATTR_PEER_SERVICE = 'peer.service' as const;

export const tracer = api.trace.getTracer('@chialab/sveltekit-utils');

/**
 * Decorator to trace a method or function by wrapping it in a new active span.
 *
 * @param options Span options
 */
export const trace =
	(options: SpanOptions = {}) =>
	(_: any, method: PropertyKey, descriptor: PropertyDescriptor) => ({
		...descriptor,
		value(...args: any[]) {
			return tracer.startActiveSpan(
				[this?.constructor?.name, method].filter(Boolean).join('.'),
				options,
				async (span: Span) => {
					try {
						// Wait for the wrapped function to end before closing the span and returning
						return await descriptor.value.call(this, ...args);
					} catch (e) {
						span.setStatus({ code: SpanStatusCode.ERROR });
						if (e instanceof Error) {
							span.recordException(e);
						}

						throw e;
					} finally {
						span.end();
					}
				},
			);
		},
	});
