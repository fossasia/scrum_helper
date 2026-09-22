import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DOMPurify from '../src/libs/purify.min.js';

// domSanitizer.js is a plain script with no exports, so evaluate the shipped source as-is.
const sanitizeHtml = new Function(`${readFileSync(resolve('src/scripts/domSanitizer.js'), 'utf8')}\nreturn sanitizeHtml;`)();

describe('sanitizeHtml with DOMPurify', () => {
	beforeEach(() => {
		globalThis.DOMPurify = DOMPurify;
	});

	afterEach(() => {
		delete globalThis.DOMPurify;
	});

	it.each(['a', 'b', 'button', 'div', 'i', 'span', 'li', 'ul'])('keeps allowed <%s> tags', (tag) => {
		expect(sanitizeHtml(`<${tag}>x</${tag}>`)).toBe(`<${tag}>x</${tag}>`);
	});

	it('keeps <br>', () => {
		expect(sanitizeHtml('a<br>b')).toBe('a<br>b');
	});

	it.each(['script', 'iframe'])('strips forbidden <%s> tags with their content', (tag) => {
		expect(sanitizeHtml(`<b>ok</b><${tag}>bad</${tag}>`)).toBe('<b>ok</b>');
	});

	it.each(['object', 'embed', 'image'])('strips forbidden <%s> tags but keeps their text', (tag) => {
		expect(sanitizeHtml(`<b>ok</b><${tag}>bad</${tag}>`)).toBe('<b>ok</b>bad');
	});

	it('does not keep script content', () => {
		expect(sanitizeHtml('<b>ok</b><script>alert(1)</script>')).toBe('<b>ok</b>');
	});

	it.each(['onerror', 'onload', 'onclick', 'onmouseover'])('removes the %s attribute', (attr) => {
		expect(sanitizeHtml(`<div ${attr}="alert(1)">x</div>`)).toBe('<div>x</div>');
	});

	it('keeps allowed attributes', () => {
		const attrs = { href: 'https://example.org', class: 'c', target: '_blank', rel: 'noopener', 'data-repo-name': 'r' };
		const html = `<a ${Object.entries(attrs)
			.map(([k, v]) => `${k}="${v}"`)
			.join(' ')}>x</a>`;
		// DOMPurify may reorder attributes, so compare them by name.
		const link = document.createRange().createContextualFragment(sanitizeHtml(html)).firstChild;
		for (const [name, value] of Object.entries(attrs)) {
			expect(link.getAttribute(name)).toBe(value);
		}
	});

	it('drops javascript: URLs from href', () => {
		expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
	});

	it('unwraps tags outside the allow-list but keeps their text', () => {
		expect(sanitizeHtml('<p>para</p>')).toBe('para');
	});

	it('removes an img with an error handler entirely', () => {
		expect(sanitizeHtml('<img src=x onerror=alert(1)>')).toBe('');
	});

	it.each([null, undefined, ''])('returns an empty string for %s', (input) => {
		expect(sanitizeHtml(input)).toBe('');
	});
});

describe('sanitizeHtml fallback without DOMPurify', () => {
	beforeEach(() => {
		delete globalThis.DOMPurify;
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('warns that DOMPurify is unavailable', () => {
		sanitizeHtml('x');
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('DOMPurify unavailable'));
	});

	it('strips HTML tags', () => {
		expect(sanitizeHtml('<b>bold</b> text')).toBe('bold text');
	});

	it('escapes special characters', () => {
		expect(sanitizeHtml(`a & "b" 'c' > d`)).toBe('a &amp; &quot;b&quot; &#039;c&#039; &gt; d');
	});

	it('leaves no markup behind for a script tag', () => {
		expect(sanitizeHtml('<script>alert(1)</script>')).not.toMatch(/</);
	});

	it.each([null, undefined, 5, {}, []])('returns an empty string for non-string input %s', (input) => {
		expect(sanitizeHtml(input)).toBe('');
	});

	it('returns an empty string for an empty string', () => {
		expect(sanitizeHtml('')).toBe('');
	});
});
