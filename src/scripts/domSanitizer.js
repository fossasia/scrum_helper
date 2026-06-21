const SCRUM_SANITIZER_CONFIG = {
	ALLOWED_TAGS: ['a', 'b', 'br', 'button', 'div', 'i', 'span', 'li', 'ul'],
	ALLOWED_ATTR: ['class', 'style', 'href', 'target', 'rel', 'contenteditable', 'data-repo-name', 'type'],
	FORBID_TAGS: ['image', 'script', 'iframe', 'object', 'embed'],
	FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
};

function sanitizeHtml(html) {
	if (typeof DOMPurify !== 'undefined') {
		return DOMPurify.sanitize(html, SCRUM_SANITIZER_CONFIG);
	}
	console.warn('[scrum_helper] DOMPurify unavailable, falling back to basic text extraction');

	if (typeof html !== 'string') return '';

	//Step 1: Strip tags so the user doesn't see raw HTML on the screen
	const stripped = html.replace(/<[^>]*>?/gm, '');

	//Step 2: Escape any remaining characters to guarantee safety in .innerHTML
	return stripped
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
