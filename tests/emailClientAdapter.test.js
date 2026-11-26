import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import '../src/scripts/emailClientAdapter.js';

function detectClientFor(hostname) {
	window.happyDOM.setURL(`https://${hostname}/`);
	return window.emailClientAdapter.detectClient();
}

const cases = [
	['gmail', ['mail.google.com'], ['google.com', 'mail.google.org', 'fake-mail.google.com.attacker.com']],
	['google-groups', ['groups.google.com'], ['google.com', 'groups.google.org']],
	[
		'outlook',
		[
			'outlook.com',
			'sub.outlook.com',
			'portal.office.com',
			'admin.office365.com',
			'outlook.live.com',
			'outlook.cloud.microsoft',
		],
		['fakeoutlook.com', 'office.org', 'microsoft.com', 'eviloutlook.live.com', 'eviloutlook.cloud.microsoft'],
	],
	['yahoo', ['mail.yahoo.com'], ['yahoo.com', 'news.yahoo.com']],
];

describe('EmailClientAdapter detectClient', () => {
	let originalURL;

	beforeAll(() => {
		originalURL = window.location.href;
	});

	afterEach(() => {
		window.happyDOM.setURL(originalURL);
	});

	describe.each(cases)('%s', (id, valid, invalid) => {
		it.each(valid)(`should detect ${id} on %s`, (hostname) => {
			expect(detectClientFor(hostname)).toBe(id);
		});

		it.each(invalid)(`should not detect ${id} on %s`, (hostname) => {
			expect(detectClientFor(hostname)).not.toBe(id);
		});
	});

	it('should return null for an unsupported hostname', () => {
		expect(detectClientFor('example.com')).toBeNull();
	});
});

describe('EmailClientAdapter isNewConversation', () => {
	let originalURL;

	beforeAll(() => {
		originalURL = window.location.href;
	});

	afterEach(() => {
		window.happyDOM.setURL(originalURL);
		document.body.innerHTML = '';
	});

	it('should return false if client is not detected', () => {
		window.happyDOM.setURL('https://unknown-domain.com/');
		expect(window.emailClientAdapter.isNewConversation()).toBe(false);
	});

	it('should return false if editor elements or subject element cannot be found', () => {
		window.happyDOM.setURL('https://outlook.office.com/');
		expect(window.emailClientAdapter.isNewConversation()).toBe(false);
	});

	describe('Outlook subject prefix handling', () => {
		function setupOutlookDOM(subjectValue) {
			window.happyDOM.setURL('https://outlook.office.com/');
			document.body.innerHTML = `
				<input aria-label="Subject" type="text" />
				<div role="textbox" contenteditable="true" aria-multiline="true"></div>
			`;
			const subjectInput = document.querySelector('input[aria-label="Subject"]');
			subjectInput.value = subjectValue;
			return subjectInput;
		}

		it.each([
			['RE: Daily Scrum Report', 'uppercase Outlook reply prefix'],
			['re: daily standup', 'lowercase reply prefix'],
			['Re: Sprint Planning', 'standard titlecase reply prefix'],
			['rE: Architecture discussion', 'mixed-case reply prefix'],
			['FW: Handover notes', 'uppercase Outlook forward prefix'],
			['Fw: Handover notes', 'titlecase Outlook forward prefix'],
			['fw: handover notes', 'lowercase Outlook forward prefix'],
			['FWD: Project handover', 'uppercase forward prefix'],
			['Fwd: Documentation review', 'titlecase forward prefix'],
			['fwd: doc update', 'lowercase forward prefix'],
			['Re[2]: Multiple replies', 'reply prefix with iteration count'],
			['RE[4]: Repeated replies', 'uppercase reply prefix with iteration count'],
			['  RE: With leading and trailing whitespace  ', 'trimmed reply prefix'],
			['Re : Spaced colon reply', 'optional space before colon'],
		])('should return false (not new conversation) for %s (%s)', (subjectText) => {
			setupOutlookDOM(subjectText);
			expect(window.emailClientAdapter.isNewConversation()).toBe(false);
		});

		it.each([
			['Daily Scrum Report - 2026-11-26', 'new report subject'],
			['Reviewing Q4 deliverables', 'word starting with Re but not reply prefix'],
			['Report for client', 'word starting with Re but not reply prefix'],
			['Rewriting unit tests', 'word starting with Re but not reply prefix'],
			['Forwarding guidelines', 'word starting with Forwarding but not forward prefix'],
			['FWD-Review', 'missing colon separator'],
			['', 'empty subject on new compose'],
		])('should return true (new conversation) for %s (%s)', (subjectText) => {
			setupOutlookDOM(subjectText);
			expect(window.emailClientAdapter.isNewConversation()).toBe(true);
		});
	});

	describe('reply context detection across clients', () => {
		it('should recognize reply in Outlook when [aria-label="Reply"] is present even with custom subject', () => {
			window.happyDOM.setURL('https://outlook.office.com/');
			document.body.innerHTML = `
				<button aria-label="Reply">Reply</button>
				<input aria-label="Subject" type="text" />
				<div role="textbox" contenteditable="true" aria-multiline="true"></div>
			`;
			const subjectInput = document.querySelector('input[aria-label="Subject"]');
			subjectInput.value = 'Clean Thread Subject';
			expect(window.emailClientAdapter.isNewConversation()).toBe(false);
		});

		it('should recognize reply in Gmail when editor is inline outside dialog', () => {
			window.happyDOM.setURL('https://mail.google.com/');
			document.body.innerHTML = `
				<input name="subjectbox" tabindex="1" value="Thread Discussion" />
				<div class="Am Al editable LW-avf" contenteditable="true" role="textbox"></div>
			`;
			expect(window.emailClientAdapter.isNewConversation()).toBe(false);
		});

		it('should recognize new conversation in Gmail when editor is inside dialog and subject is clean', () => {
			window.happyDOM.setURL('https://mail.google.com/');
			document.body.innerHTML = `
				<div role="dialog">
					<input name="subjectbox" tabindex="1" value="New Topic Discussion" />
					<div class="editable LW-avf Am Al" contenteditable="true" role="textbox"></div>
				</div>
			`;
			expect(window.emailClientAdapter.isNewConversation()).toBe(true);
		});

		it('should recognize reply in Yahoo when compose header title indicates reply', () => {
			window.happyDOM.setURL('https://mail.yahoo.com/');
			document.body.innerHTML = `
				<div data-test-id="compose-header-title">Reply to team</div>
				<input id="compose-subject-input" value="Thread Topic" />
				<div id="editor-container"><div contenteditable="true" role="textbox"></div></div>
			`;
			expect(window.emailClientAdapter.isNewConversation()).toBe(false);
		});
	});
});
