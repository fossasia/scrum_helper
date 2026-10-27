/**
 * Utility functions to convert Scrum Helper HTML reports into clean GitHub Flavored Markdown (GFM).
 */

function capitalizeFirstLetter(str) {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Traverses a DOM node recursively and converts its content into Markdown.
 * @param {Node} node
 * @param {Object} options
 * @param {number} options.depth - Current list indentation depth
 * @returns {string}
 */
function nodeToMarkdown(node, options = { depth: 0 }) {
	if (!node) return '';

	// 1. Text Node: Escape square brackets to prevent deceptive or broken markdown link injection
	if (node.nodeType === 3 /* Node.TEXT_NODE */) {
		const val = node.nodeValue || '';
		return val.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
	}

	// 2. Non-Element Node
	if (node.nodeType !== 1 /* Node.ELEMENT_NODE */) {
		return '';
	}

	const tagName = node.tagName.toUpperCase();
	const depth = options.depth || 0;

	// Check if this is a status badge (GitHub/GitLab/Codeberg)
	const rawText = node.textContent?.trim().toLowerCase() || '';
	const isKnownStatusText = rawText === 'open' || rawText === 'closed' || rawText === 'merged' || rawText === 'draft';
	const isStatusBadge =
		node.classList.contains('State') ||
		node.classList.contains('state') ||
		node.classList.contains('status-badge') ||
		node.classList.contains('badge') ||
		((tagName === 'DIV' || tagName === 'SPAN') && isKnownStatusText && node.childNodes.length <= 1);

	if (isStatusBadge) {
		if (rawText) {
			return ` \`${capitalizeFirstLetter(rawText)}\` `;
		}
		return '';
	}

	// Process child nodes
	const getChildrenMarkdown = (childOptions = options) => {
		let res = '';
		for (const child of node.childNodes) {
			res += nodeToMarkdown(child, childOptions);
		}
		return res;
	};

	switch (tagName) {
		case 'B':
		case 'STRONG': {
			const text = node.textContent.trim();
			// Check for Top-Level Scrum Questions, e.g.: "1. What did I do yesterday?"
			// Using H2 (##) ensures compatibility across Discord (which only supports up to H3), Slack, and GitHub
			if (/^\d+\.\s+What\s+/i.test(text)) {
				return `\n\n## ${text}\n\n`;
			}
			// Check for Activity subheadings (e.g., "Issues:", "Pull Requests:", "Merge Requests:")
			if (/^(Issues|Pull Requests|Merge Requests|Reviewed Pull Requests|Reviewed Merge Requests):$/i.test(text)) {
				return `\n\n### **${text}**\n`;
			}
			// Check for Platform headings (e.g. "GitHub:", "GitLab:", "Codeberg:")
			if (/^(GitHub|GitLab|Codeberg):$/i.test(text)) {
				return `\n\n### **${text}**\n`;
			}
			const inner = getChildrenMarkdown();
			return inner.trim() ? `**${inner.trim()}**` : '';
		}

		case 'A': {
			const href = node.getAttribute('href');
			const linkText = getChildrenMarkdown().trim() || href || '';
			if (!href) return linkText;
			return `[${linkText}](${href})`;
		}

		case 'I':
		case 'EM': {
			const inner = getChildrenMarkdown().trim();
			return inner ? `*${inner}*` : '';
		}

		case 'CODE': {
			const inner = getChildrenMarkdown();
			return `\`${inner}\``;
		}

		case 'UL':
		case 'OL': {
			let listOutput = '';
			const isOuterList = depth === 0;
			for (const child of node.childNodes) {
				if (child.nodeType === 1 && child.tagName.toUpperCase() === 'LI') {
					listOutput += nodeToMarkdown(child, { depth: depth + 1 });
				}
			}
			return isOuterList ? `\n${listOutput}\n` : listOutput;
		}

		case 'LI': {
			const indent = '  '.repeat(Math.max(0, depth - 1));
			// Check if this LI is a repository group item or has a nested list
			const childUl = Array.from(node.childNodes).find(
				(n) => n.nodeType === 1 && (n.tagName.toUpperCase() === 'UL' || n.tagName.toUpperCase() === 'OL'),
			);

			const isCommitList = childUl && childUl.classList && childUl.classList.contains('commitList');
			const isRepoGroup =
				childUl &&
				!isCommitList &&
				(node.querySelector('i') !== null || /^\s*\(.+?\/.+?\)/.test(node.textContent));

			if (isRepoGroup) {
				// Extract the repo header part before the child list
				let repoHeader = '';
				for (const child of node.childNodes) {
					if (child === childUl) break;
					repoHeader += nodeToMarkdown(child, options);
				}
				repoHeader = repoHeader.trim();
				// Normalize repoHeader: if wrapped in *(repo)* or (repo), format as **repo**
				const repoMatch = repoHeader.match(/^\*?\((.+?)\)\*?$/) || repoHeader.match(/^\*?\*?\((.+?)\)\*?\*?$/);
				const formattedRepo = repoMatch ? `**${repoMatch[1]}**` : repoHeader ? `**${repoHeader}**` : '';

				const itemsMarkdown = nodeToMarkdown(childUl, { depth });
				return `${indent}- ${formattedRepo}\n${itemsMarkdown}`;
			}

			// If this is an activity item with a nested commitList:
			if (childUl && isCommitList) {
				let itemHeader = '';
				for (const child of node.childNodes) {
					if (child === childUl) break;
					itemHeader += nodeToMarkdown(child, options);
				}
				itemHeader = itemHeader.replace(/\s+/g, ' ').trim();
				const commitsMarkdown = nodeToMarkdown(childUl, { depth: depth + 1 });
				return `${indent}- ${itemHeader}\n${commitsMarkdown}`;
			}

			// Regular leaf LI item (issue, PR, next plan, or commit)
			let itemContent = getChildrenMarkdown({ depth });
			itemContent = itemContent.replace(/\s+/g, ' ').trim();
			return `${indent}- ${itemContent}\n`;
		}

		case 'BR':
			return '\n';

		case 'DIV':
		case 'P': {
			// Check for empty placeholder divs
			const text = node.textContent.trim();
			if (
				text === 'No activity to report for the selected time period.' ||
				text === 'No plans added yet.' ||
				text.startsWith('No Blocker at the moment')
			) {
				return `*${text}*\n\n`;
			}
			const content = getChildrenMarkdown();
			return content ? `\n${content}\n` : '\n';
		}

		default:
			return getChildrenMarkdown();
	}
}

/**
 * Converts Scrum Helper HTML report into clean GitHub Flavored Markdown (GFM).
 * Uses DOMParser to safely parse HTML strings without innerHTML injection.
 * @param {string|HTMLElement} input - HTML string or DOM node
 * @returns {string} Clean Markdown representation
 */
function convertHtmlToMarkdown(input) {
	if (!input) return '';

	let container;
	if (typeof input === 'string') {
		if (typeof DOMParser !== 'undefined') {
			const sanitized = typeof sanitizeHtml === 'function' ? sanitizeHtml(input) : input;
			const doc = new DOMParser().parseFromString(sanitized, 'text/html');
			container = doc.body;
		} else {
			return input;
		}
	} else if (input.nodeType) {
		container = input.cloneNode(true);
	} else {
		return '';
	}

	const rawMarkdown = nodeToMarkdown(container, { depth: 0 });

	// Normalize whitespace line-by-line while preserving indentation
	const lines = rawMarkdown.split('\n').map((line) => {
		const indentMatch = line.match(/^(\s*)/);
		const indent = indentMatch ? indentMatch[1] : '';
		const trimmedContent = line.slice(indent.length).replace(/[ \t]+/g, ' ').trim();
		return trimmedContent ? `${indent}${trimmedContent}` : '';
	});

	return lines
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

if (typeof window !== 'undefined') {
	window.convertHtmlToMarkdown = convertHtmlToMarkdown;
}
if (typeof globalThis !== 'undefined') {
	globalThis.convertHtmlToMarkdown = convertHtmlToMarkdown;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { convertHtmlToMarkdown, nodeToMarkdown };
}
