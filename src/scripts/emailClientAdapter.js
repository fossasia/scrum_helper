/**
 * Sanitize email content to prevent XSS attacks while preserving formatting
 * @param {string} html - The HTML content to sanitize
 * @returns {string} Sanitized HTML safe for injection
 */
function sanitizeEmailContent(html) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(String(html), 'text/html');
	// Allow more tags for email content formatting
	const allowedTags = new Set([
		'B',
		'STRONG',
		'I',
		'EM',
		'CODE',
		'A',
		'BR',
		'SPAN',
		'P',
		'U',
		'DIV',
		'H1',
		'H2',
		'H3',
		'H4',
		'H5',
		'H6',
		'UL',
		'OL',
		'LI',
		'TABLE',
		'TR',
		'TD',
		'TH',
		'THEAD',
		'TBODY',
		'TFOOT',
		'BLOCKQUOTE',
		'SMALL',
		'PRE',
		'HR',
	]);

	function cleanNode(node) {
		const children = Array.from(node.childNodes);
		children.forEach((child) => {
			if (child.nodeType === Node.ELEMENT_NODE) {
				const tag = child.nodeName.toUpperCase();
				if (!allowedTags.has(tag)) {
					// Replace disallowed element with its text content
					const text = document.createTextNode(child.textContent || '');
					node.replaceChild(text, child);
				} else {
					// Remove inline event handlers and unsafe attributes
					Array.from(child.attributes).forEach((attr) => {
						const name = attr.name.toLowerCase();
						const value = attr.value || '';
						// Remove all event handlers
						if (name.startsWith('on')) {
							child.removeAttribute(attr.name);
						}
						// Validate href/src attributes
						else if (name === 'href' || name === 'src') {
							if (!/^(https?:|mailto:|tel:|\/|#)/i.test(value)) {
								child.removeAttribute(attr.name);
							}
						}
						// Only allow safe attributes
						else if (
							!['class', 'title', 'rel', 'target', 'aria-label', 'href', 'src', 'colspan', 'rowspan'].includes(name)
						) {
							child.removeAttribute(attr.name);
						}
					});

					// Set safe defaults for links
					if (child.nodeName.toUpperCase() === 'A') {
						child.setAttribute('rel', 'noopener noreferrer');
						if (!child.getAttribute('target')) child.setAttribute('target', '_blank');
					}

					// Recurse into allowed children
					cleanNode(child);
				}
			} else if (child.nodeType === Node.TEXT_NODE) {
				// text nodes are safe
			} else {
				// remove comments, processing instructions, etc.
				node.removeChild(child);
			}
		});
	}

	cleanNode(doc.body);
	// Return serialized HTML string instead of DocumentFragment
	return doc.body.innerHTML;
}

class EmailClientAdapter {
	static debug = false;

	isNewConversation() {
		const clientType = this.detectClient();
		if (!clientType) return false;
		const elements = this.getEditorElements();
		if (!elements || !elements.subject) return false;
		const currentSubject = elements.subject.value || '';
		const isReplySubject = currentSubject.startsWith('Re:') || currentSubject.startsWith('Fwd:');
		let isReplyContext = false;

		switch (clientType) {
			case 'gmail': {
				const editor = document.querySelector('.Am.Al.editable.LW-avf');
				const isNewWindow = editor ? !!editor.closest('div[role="dialog"]') : false;
				isReplyContext = !isNewWindow;
				break;
			}

			case 'outlook': {
				isReplyContext = !!document.querySelector('[aria-label="Reply"]');
				break;
			}

			case 'yahoo': {
				const header = document.querySelector('[data-test-id="compose-header-title"]');
				if (header) {
					const title = header.innerText.trim().toLowerCase();
					isReplyContext = title.includes('reply') || title.includes('forward');
				}
				break;
			}
		}
		return !(isReplySubject || isReplyContext);
	}
	constructor() {
		this.clientConfigs = {
			'google-groups': {
				selectors: {
					body: 'c-wiz [aria-label="Compose a message"][role=textbox][contenteditable="true"]',
					subject: 'c-wiz input[aria-label=Subject][type="text"]',
				},
				eventTypes: {
					contentChange: 'paste',
					subjectChange: 'input',
				},
			},
			gmail: {
				selectors: {
					body: 'div.editable.LW-avf[contenteditable="true"][role="textbox"]',
					subject: 'input[name="subjectbox"][tabindex="1"]',
				},
				eventTypes: {
					contentChange: 'input',
					subjectChange: 'input',
				},
			},
			outlook: {
				selectors: {
					body: 'div[role="textbox"][contenteditable="true"][aria-multiline="true"]',
					subject: [
						'input[aria-label="Subject"][type="text"]',
						'input[aria-label="Add a subject"][type="text"][role="textbox"][aria-multiline="false"]',
					],
				},
				eventTypes: {
					contentChange: 'input',
					subjectChange: 'change',
				},
				injectMethod: 'focusAndPaste', // Custom injection method
			},
			yahoo: {
				selectors: {
					body: [
						// Desktop selectors
						'#editor-container [contenteditable="true"][role="textbox"]',
						'[aria-multiline="true"][aria-label="Message body"][contenteditable="true"][role="textbox"]',
						'[aria-label="Message body"][contenteditable="true"]',
						'[role="textbox"][contenteditable="true"]',
						'[data-test-id*="compose"][contenteditable="true"]',
						'.compose-editor [contenteditable="true"]',
						// Mobile selectors
						'#editor-container-mobile [contenteditable="true"][role="textbox"]',
					].join(', '),
					subject: [
						// Desktop selectors
						'#compose-subject-input, input[placeholder="Subject"][id="compose-subject-input"]',
						'#compose-subject-input',
						'input[placeholder="Subject"]',
						'input[aria-label*="subject" i]',
						'input[data-test-id*="subject" i]',
						// Mobile selectors
						'#compose-subject-input-mobile, input[placeholder="Subject"][id="compose-subject-input-mobile"]',
					].join(', '),
				},
				eventTypes: {
					contentChange: 'input',
					subjectChange: 'change',
				},
				injectMethod: 'setContent', // Custom injection method
			},
		};
	}

	detectClient() {
		const hostname = window.location.hostname;
		if (hostname === 'groups.google.com') return 'google-groups';
		if (hostname === 'mail.google.com') return 'gmail';
		if (
			hostname.endsWith('.outlook.com') ||
			hostname.endsWith('.office.com') ||
			hostname.endsWith('.office365.com') ||
			hostname.endsWith('outlook.live.com') ||
			hostname.includes('.outlook.')
		)
			return 'outlook';
		if (hostname === 'mail.yahoo.com') return 'yahoo';
		return null;
	}

	getEditorElements() {
		const clientType = this.detectClient();
		if (!clientType) return null;

		const config = this.clientConfigs[clientType];
		const normalizeSelector = (sel) => (Array.isArray(sel) ? sel.join(', ') : sel);

		const bodySel = normalizeSelector(config.selectors.body);
		const subjectSel = normalizeSelector(config.selectors.subject);

		const isVisible = (el) => {
			if (!el) return false;
			if (el.closest('[aria-hidden="true"]')) return false;

			const style = window.getComputedStyle(el);
			if (style.display === 'none' || style.visibility === 'hidden') return false;

			const rect = el.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		};

		const maxAncestorZIndex = (el) => {
			let cur = el;
			let best = 0;
			for (let i = 0; i < 10 && cur; i++) {
				const z = Number.parseInt(window.getComputedStyle(cur).zIndex, 10);
				if (Number.isFinite(z)) best = Math.max(best, z);
				cur = cur.parentElement;
			}
			return best;
		};

		const activeEl = document.activeElement;

		// when multiple compose windows exists, we choose the focused one.
		if (clientType === 'gmail') {
			const bodiesAll = Array.from(document.querySelectorAll(bodySel));
			const bodies = bodiesAll.filter(isVisible);
			const candidates = bodies.length ? bodies : bodiesAll;

			let bestBody = null;
			let bestScore = -Infinity;

			for (let i = 0; i < candidates.length; i++) {
				const body = candidates[i];
				const dialog = body.closest('div[role="dialog"]') || body.closest('[role="dialog"]');

				const focused = activeEl && (body === activeEl || body.contains(activeEl)) ? 1_000_000 : 0;
				const z = maxAncestorZIndex(dialog || body);

				const score = focused + z * 1000 + i;

				if (score >= bestScore) {
					bestScore = score;
					bestBody = body;
				}
			}

			const container = bestBody?.closest('div[role="dialog"]') || bestBody?.closest('[role="dialog"]') || document;

			const scopedSubjects = Array.from(container.querySelectorAll(subjectSel));
			const subject =
				scopedSubjects.filter(isVisible).pop() || scopedSubjects.pop() || document.querySelector(subjectSel);

			return {
				body: bestBody,
				subject,
				eventTypes: config.eventTypes,
			};
		}

		const bodiesAll = Array.from(document.querySelectorAll(bodySel));
		const subjectsAll = Array.from(document.querySelectorAll(subjectSel));

		const body = bodiesAll.filter(isVisible).pop() || bodiesAll.pop() || null;

		let subject = null;
		if (body) {
			const container =
				body.closest('[role="dialog"]') ||
				body.closest('[data-test-id*="compose"]') ||
				body.closest('.compose-editor') ||
				body.closest('#editor-container') ||
				body.closest('#editor-container-mobile') ||
				document;

			const scoped = Array.from(container.querySelectorAll(subjectSel));
			subject = scoped.filter(isVisible).pop() || scoped.pop() || null;
		}

		if (!subject) {
			subject = subjectsAll.filter(isVisible).pop() || subjectsAll.pop() || null;
		}

		return {
			body,
			subject,
			eventTypes: config.eventTypes,
		};
	}

	// Helper method to injectContent
	dispatchElementEvents(element, events, includeKeyboard = false) {
		if (!element || !events) return;

		const eventsToDispatch = Array.isArray(events) ? events : [events];

		eventsToDispatch.forEach((eventType) => {
			// Dispatch standard events
			element.dispatchEvent(new Event(eventType, { bubbles: true }));

			// Dispatch keyboard events if needed
			if (includeKeyboard) {
				element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
				element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
			}
		});
	}

	injectContent(element, content, eventType) {
		if (!element) {
			if (EmailClientAdapter.debug) console.log('[EmailClientAdapter] No element found for injection');
			return false;
		}
		const clientType = this.detectClient();
		const config = this.clientConfigs[clientType];

		try {
			switch (config?.injectMethod) {
				case 'focusAndPaste':
					// Special handling for Outlook
					element.focus();
					element.innerHTML = sanitizeEmailContent(content);
					this.dispatchElementEvents(element, ['input', 'change'], true);
					break;

				case 'setContent': {
					// Special handling for Yahoo
					element.innerHTML = sanitizeEmailContent(content);
					element.focus();
					// Force Yahoo's editor to recognize the change
					const selection = window.getSelection();
					const range = document.createRange();
					range.selectNodeContents(element);
					selection.removeAllRanges();
					selection.addRange(range);
					this.dispatchElementEvents(element, ['input', 'change']);
					break;
				}

				default:
					// Default handling for Google clients
					element.innerHTML = sanitizeEmailContent(content);
					element.dispatchEvent(new Event(eventType, { bubbles: true }));
			}
			return true;
		} catch (error) {
			console.error('[EmailClientAdapter] Content injection failed:', error);
			return false;
		}
	}

	retryInjection(element, content, eventType, maxRetries = 3) {
		let attempts = 0;
		return new Promise((resolve, reject) => {
			const tryInject = () => {
				if (attempts >= maxRetries) {
					console.error('[EmailClientAdapter] Max retry attempts reached');
					reject(new Error('[EmailClientAdapter] Max retry attempts reached'));
					return;
				}
				attempts++;
				if (this.injectContent(element, content, eventType)) {
					resolve(true);
				} else {
					setTimeout(tryInject, 1000);
				}
			};
			tryInject();
		});
	}
}

// Create global instance
window.emailClientAdapter = new EmailClientAdapter();
if (EmailClientAdapter.debug) console.log('[EmailClientAdapter] Email client adapter initialized');

// Set up message listener for insert to email functionality
if (EmailClientAdapter.debug) console.log('[EmailClientAdapter] Registering message listener...');
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (EmailClientAdapter.debug) console.log('[EmailClientAdapter] Received message from popup:', request.action);

	if (request.action === 'insertReportToEmail') {
		if (EmailClientAdapter.debug) console.log('[EmailClientAdapter] Processing insertReportToEmail request');
		handleInsertReportToEmail(request.content, request.subject, sendResponse);
		return true; // Indicate async response
	}
});
if (EmailClientAdapter.debug) console.log('[EmailClientAdapter] Message listener registered successfully');

async function handleInsertReportToEmail(content, subject, sendResponse) {
	try {
		if (EmailClientAdapter.debug) console.log('[EmailClientAdapter] Attempting to inject content into email');

		if (!window.emailClientAdapter) {
			console.error('[EmailClientAdapter] Email client adapter not available');
			sendResponse({ success: false, error: 'Email client adapter not available' });
			return;
		}

		const tryInject = () => {
			const elements = window.emailClientAdapter.getEditorElements?.();
			if (EmailClientAdapter.debug) console.log('[EmailClientAdapter] Editor elements found:', !!elements?.body);

			if (!elements?.body) return false;

			// Inject subject if available
			if (subject && elements.subject) {
				if (EmailClientAdapter.debug) console.log('[EmailClientAdapter] Injecting subject');
				elements.subject.value = subject;
				elements.subject.dispatchEvent(new Event(elements.eventTypes?.subjectChange || 'input', { bubbles: true }));
			}

			// Inject content
			if (EmailClientAdapter.debug) console.log('[EmailClientAdapter] Injecting content');
			window.emailClientAdapter.injectContent(elements.body, content, elements.eventTypes?.contentChange || 'input');
			return true;
		};

		if (tryInject()) {
			if (EmailClientAdapter.debug) console.log('[EmailClientAdapter] Content injected successfully');
			sendResponse({ success: true });
			return;
		}

		// Wait up to 30 seconds for editor to become available
		if (EmailClientAdapter.debug) console.log('[EmailClientAdapter] Editor not ready, waiting for DOM...');
		let done = false;
		const observer = new MutationObserver(() => {
			if (!done && tryInject()) {
				done = true;
				observer.disconnect();
				if (EmailClientAdapter.debug) console.log('[EmailClientAdapter] Content injected after waiting');
				sendResponse({ success: true });
			}
		});

		observer.observe(document.body, { childList: true, subtree: true });

		setTimeout(() => {
			if (!done) {
				observer.disconnect();
				console.warn('[EmailClientAdapter] Timeout waiting for editor');
				sendResponse({ success: false, error: 'Email editor not found (timeout)' });
			}
		}, 30000);
	} catch (error) {
		console.error('[EmailClientAdapter] Error injecting content:', error);
		sendResponse({ success: false, error: error?.message || String(error) });
	}
}
