const CLIENT_PATTERNS = [
	{ id: 'google-groups', match: (hostname) => hostname === 'groups.google.com' },
	{ id: 'gmail', match: (hostname) => hostname === 'mail.google.com' },
	{
		id: 'outlook',
		match: (hostname) =>
			hostname === 'outlook.com' ||
			hostname.endsWith('.outlook.com') ||
			hostname.endsWith('.office.com') ||
			hostname.endsWith('.office365.com') ||
			hostname.endsWith('outlook.live.com') ||
			hostname.endsWith('outlook.cloud.microsoft'),
	},
	{ id: 'yahoo', match: (hostname) => hostname === 'mail.yahoo.com' },
];
class EmailClientAdapter {
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
				injectMethod: 'focusAndPaste',
			},
			yahoo: {
				selectors: {
					body: [
						'#editor-container [contenteditable="true"][role="textbox"]',
						'[aria-multiline="true"][aria-label="Message body"][contenteditable="true"][role="textbox"]',
						'[aria-label="Message body"][contenteditable="true"]',
						'[role="textbox"][contenteditable="true"]',
						'[data-test-id*="compose"][contenteditable="true"]',
						'.compose-editor [contenteditable="true"]',
						'#editor-container-mobile [contenteditable="true"][role="textbox"]',
					].join(', '),
					subject: [
						'#compose-subject-input, input[placeholder="Subject"][id="compose-subject-input"]',
						'#compose-subject-input',
						'input[placeholder="Subject"]',
						'input[aria-label*="subject" i]',
						'input[data-test-id*="subject" i]',
						'#compose-subject-input-mobile, input[placeholder="Subject"][id="compose-subject-input-mobile"]',
					].join(', '),
				},
				eventTypes: {
					contentChange: 'input',
					subjectChange: 'change',
				},
				injectMethod: 'setContent',
			},
		};
	}

	detectClient() {
		const hostname = window.location.hostname;
		return CLIENT_PATTERNS.find((pattern) => pattern.match(hostname))?.id || null;
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
			if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;

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

	dispatchElementEvents(element, events, includeKeyboard = false) {
		if (!element || !events) return;

		const eventsToDispatch = Array.isArray(events) ? events : [events];

		eventsToDispatch.forEach((eventType) => {
			element.dispatchEvent(new Event(eventType, { bubbles: true }));

			if (includeKeyboard) {
				element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
				element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
			}
		});
	}

	insertHtmlAtCursorOrPrepend(element, content) {
		const sanitizedContent = sanitizeHtml(content);

		try {
			const selection = window.getSelection();
			if (selection && selection.rangeCount > 0) {
				const range = selection.getRangeAt(0);
				if (element.contains(range.startContainer)) {
					range.deleteContents();

					const parser = new DOMParser();
					const parsedDoc = parser.parseFromString(sanitizedContent, 'text/html');
					const body = parsedDoc.body;

					const fragment = document.createDocumentFragment();
					let lastNode = null;
					while (body.firstChild) {
						lastNode = body.firstChild;
						fragment.appendChild(lastNode);
					}

					range.insertNode(fragment);

					if (lastNode) {
						const newRange = document.createRange();
						newRange.setStartAfter(lastNode);
						newRange.collapse(true);
						selection.removeAllRanges();
						selection.addRange(newRange);
					}
					return true;
				}
			}
		} catch (selectionError) {
			console.warn('Failed selection-based injection, falling back to prepend:', selectionError);
		}

		// Fallback: prepend the content if no active cursor is inside the editor body
		const parser = new DOMParser();
		const parsedDoc = parser.parseFromString(sanitizedContent, 'text/html');
		const body = parsedDoc.body;

		const br1 = document.createElement('br');
		const br2 = document.createElement('br');
		body.appendChild(br1);
		body.appendChild(br2);

		while (body.lastChild) {
			element.insertBefore(body.lastChild, element.firstChild);
		}

		return true;
	}

	injectContent(element, content, eventType) {
		if (!element) {
			console.log('No element found for injection');
			return false;
		}
		const clientType = this.detectClient();
		const config = this.clientConfigs[clientType];

		try {
			switch (config?.injectMethod) {
				case 'focusAndPaste':
					element.focus();
					this.insertHtmlAtCursorOrPrepend(element, content);
					this.dispatchElementEvents(element, ['input', 'change'], true);
					break;

				case 'setContent': {
					this.insertHtmlAtCursorOrPrepend(element, content);
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
					this.insertHtmlAtCursorOrPrepend(element, content);
					element.dispatchEvent(new Event(eventType, { bubbles: true }));
			}
			return true;
		} catch (error) {
			console.error('Content injection failed:', error);
			return false;
		}
	}

	retryInjection(element, content, eventType, maxRetries = 3) {
		let attempts = 0;
		return new Promise((resolve, reject) => {
			const tryInject = () => {
				if (!document.contains(element)) {
					console.error('Element is no longer in the DOM');
					reject(new Error('Element is no longer in the DOM'));
					return;
				}
				if (attempts >= maxRetries) {
					console.error('Max retry attempts reached');
					reject(new Error('Max retry attempts reached'));
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

window.emailClientAdapter = new EmailClientAdapter();
console.log('Email client adapter initialized');
