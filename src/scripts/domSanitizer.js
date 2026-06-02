const SCRUM_SANITIZER_CONFIG = {
	ALLOWED_TAGS: [
		'a',
		'b',
		'strong',
		'i',
		'em',
		'code',
		'br',
		'p',
		'ul',
		'ol',
		'li',
		'span',
		'div',
		'pre',
		'blockquote',
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'table',
		'thead',
		'tbody',
		'tr',
		'td',
		'th',
		'button',
	],
	ALLOWED_ATTR: [
		'class',
		'id',
		'title',
		'role',
		'aria-label',
		'style',
		'href',
		'target',
		'rel',
		'contenteditable',
		'data-repo-name',
		'type',
	],
	FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
	FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
	ALLOWED_URI_REGEXP: /^(?:(?:https|mailto|tel):|[^&:\/?#]*(?:[\/?#]|$))/i,
};

function sanitizeHtml(html) {
	if (typeof DOMPurify !== 'undefined') {
		return DOMPurify.sanitize(html, SCRUM_SANITIZER_CONFIG);
	}
	console.warn('[scrum_helper] DOMPurify unavailable, falling back to Text');
	if (typeof DOMParser !== 'undefined') {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');
		return doc.body.textContent || doc.body.innerText || '';
	}
	return html.replace(/<\/?[^>]+(>|$)/g, '');
}
