/**
 * Sanitize HTML string by removing all tags and returning only text content.
 */
export const sanitizeHtml = (html: string | null | undefined): string => {
	const div = document.createElement('div');
	div.innerHTML = html ?? '';

	return div.innerText;
};

/**
 * Check if is a mobile device.
 */
export const isMobile = (): boolean =>
	// @ts-expect-error User Agent Data APIs are experimental.
	navigator.userAgentData?.mobile ??
	(/Android|webOS|iPhone|iPad|iPod|BlackBerry|Opera Mini/i.test(navigator.userAgent) ||
		'ontouchstart' in window ||
		navigator.maxTouchPoints > 0);
