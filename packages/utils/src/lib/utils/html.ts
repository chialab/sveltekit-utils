import { document } from '@chialab/isomorphic-dom';
import { decode } from 'html-entities';

/**
 * Strip all HTML tags, attributes and comments and returning only text content.
 *
 * @param html The string to strip HTML from.
 */
export const stripHtml = (html: string | null | undefined): string => {
	const element = document.createElement('div');
	element.innerHTML = html ?? '';
	element.querySelectorAll('style,script,iframe').forEach((node) => node.remove());

	return decode(element.innerText);
};

/**
 * Strip all HTML tags, attributes and comments and returning only text content.
 *
 * @deprecated Use `stripHtml` instead. The functionality is identical.
 * @param html The string to strip HTML from.
 */
export const sanitizeHtml = stripHtml;
