/**
 * Check if is a mobile device.
 */
export const isMobile = (): boolean =>
	// @ts-expect-error User Agent Data APIs are experimental.
	navigator.userAgentData?.mobile ??
	(/Android|webOS|iPhone|iPad|iPod|BlackBerry|Opera Mini/i.test(navigator.userAgent) ||
		'ontouchstart' in window ||
		navigator.maxTouchPoints > 0);
