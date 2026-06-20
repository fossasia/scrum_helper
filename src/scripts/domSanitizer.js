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
	// Safely strip HTML tags without touching the DOM to completely bypass Trusted Types crashes
	return typeof html === 'string' ? html.replace(/<[^>]*>?/gm, '') : '';
}
