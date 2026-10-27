import { describe, expect, it } from 'vitest';
import { convertHtmlToMarkdown } from '../src/scripts/markdownUtils.js';

describe('convertHtmlToMarkdown', () => {
	it('returns an empty string when given null, undefined, or empty string', () => {
		expect(convertHtmlToMarkdown(null)).toBe('');
		expect(convertHtmlToMarkdown(undefined)).toBe('');
		expect(convertHtmlToMarkdown('')).toBe('');
	});

	it('converts scrum section headings into markdown H2 headings', () => {
		const html = '<b>1. What did I do yesterday?</b><br><b>2. What do I plan to do today?</b>';
		const md = convertHtmlToMarkdown(html);
		expect(md).toContain('## 1. What did I do yesterday?');
		expect(md).toContain('## 2. What do I plan to do today?');
	});

	it('converts date-range headings properly', () => {
		const html = '<b>1. What did I do from Jan 26, 2025 to Oct 26, 2026?</b>';
		const md = convertHtmlToMarkdown(html);
		expect(md).toContain('## 1. What did I do from Jan 26, 2025 to Oct 26, 2026?');
	});

	it('converts activity subheadings into bold subheadings compatible with Discord/Slack', () => {
		const html = '<b>Issues:</b><br><b>Pull Requests:</b><br><b>Reviewed Pull Requests:</b>';
		const md = convertHtmlToMarkdown(html);
		expect(md).toContain('### **Issues:**');
		expect(md).toContain('### **Pull Requests:**');
		expect(md).toContain('### **Reviewed Pull Requests:**');
	});

	it('converts status badges into code pills', () => {
		const html = `
			<li>Made PR - <a href="https://github.com/fossasia/scrum_helper/pull/42">#42</a> (Fix cache)<div class="State State--purple">merged</div></li>
			<li>Opened Issue(#23) - <a href="https://github.com/fossasia/scrum_helper/issues/23">Bug report</a><div class="State State--red">closed</div></li>
			<li>Made PR - <a href="https://github.com/fossasia/scrum_helper/pull/43">#43</a> (WIP feature)<div class="State State--green">open</div></li>
		`;
		const md = convertHtmlToMarkdown(html);
		expect(md).toContain('`Merged`');
		expect(md).toContain('`Closed`');
		expect(md).toContain('`Open`');
	});

	it('converts status badges even without State class', () => {
		const html = '<li>Made PR - <a href="url">#1</a> (Fix)<div>merged</div></li>';
		const md = convertHtmlToMarkdown(html);
		expect(md).toContain('`Merged`');
	});

	it('converts repository groupings with nested items and indentation', () => {
		const html = `
			<b>1. What did I do yesterday?</b><br>
			<b>Issues:</b>
			<ul>
				<li style="margin-bottom: 10px !important;">
					<span style="font-weight: 600;"><i>(soumik7063/JGEC_GYM_BROS)</i></span>
					<ul style="margin-top: 4px; margin-bottom: 4px;">
						<li>Opened Issue(#23) - <a href="https://github.com/soumik7063/JGEC_GYM_BROS/issues/23">Iron Feed</a><div class="State State--red">closed</div></li>
					</ul>
				</li>
			</ul>
		`;
		const md = convertHtmlToMarkdown(html);
		expect(md).toContain('## 1. What did I do yesterday?');
		expect(md).toContain('### **Issues:**');
		expect(md).toContain('- **soumik7063/JGEC_GYM_BROS**');
		expect(md).toContain('  - Opened Issue(#23) - [Iron Feed](https://github.com/soumik7063/JGEC_GYM_BROS/issues/23) `Closed`');
	});

	it('distinguishes commit lists under PRs from repository groups', () => {
		const html = `
			<ul>
				<li style="margin-bottom: 10px !important;">
					<span style="font-weight: 600;"><i>(fossasia/scrum_helper)</i></span>
					<ul>
						<li>Made PR - <a href="https://github.com/fossasia/scrum_helper/pull/1">#1</a> (Add feature)<div class="State State--purple">merged</div>
							<ul class="commitList">
								<li><a href="https://github.com/fossasia/scrum_helper/commit/abc">abc1234</a> feat: add new feature</li>
							</ul>
						</li>
					</ul>
				</li>
			</ul>
		`;
		const md = convertHtmlToMarkdown(html);
		expect(md).toContain('- **fossasia/scrum_helper**');
		expect(md).toContain('  - Made PR - [#1](https://github.com/fossasia/scrum_helper/pull/1) (Add feature) `Merged`');
		expect(md).toContain('    - [abc1234](https://github.com/fossasia/scrum_helper/commit/abc) feat: add new feature');
	});

	it('escapes square brackets in text nodes to prevent deceptive markdown link injection', () => {
		const html = '<li>Made PR - <a href="https://github.com/org/repo/pull/1">#1</a> Deceptive [phishing link](https://evil.com) text</li>';
		const md = convertHtmlToMarkdown(html);
		expect(md).toContain('\\[phishing link\\](https://evil.com)');
	});

	it('converts empty states for next plans and blockers into italicized text', () => {
		const html = `
			<b>2. What do I plan to do today?</b><br>
			<div>No plans added yet.</div><br>
			<b>3. What is blocking me from making progress?</b><br>
			<div>No Blocker at the moment...no isues?</div>
		`;
		const md = convertHtmlToMarkdown(html);
		expect(md).toContain('*No plans added yet.*');
		expect(md).toContain('*No Blocker at the moment...no isues?*');
	});

	it('converts multi-platform headers cleanly', () => {
		const html = `
			<div class="report-platform-header"><b style="text-decoration: underline;">GitHub:</b></div>
			<div>Some github content</div>
			<div class="report-platform-header"><b style="text-decoration: underline;">GitLab:</b></div>
			<div>Some gitlab content</div>
		`;
		const md = convertHtmlToMarkdown(html);
		expect(md).toContain('### **GitHub:**');
		expect(md).toContain('### **GitLab:**');
	});

	it('escapes nested brackets in link text', () => {
		const html = '<li>Opened Issue(#949) - <a href="https://github.com/fossasia/scrum_helper/issues/949">[Bug] Copied scrum report</a><div class="State State--green">open</div></li>';
		const md = convertHtmlToMarkdown(html);
		expect(md).toContain('[\\[Bug\\] Copied scrum report](https://github.com/fossasia/scrum_helper/issues/949)');
	});

	it('handles contenteditable DOM elements directly', () => {
		const div = document.createElement('div');
		div.innerHTML = '<b>1. What did I do yesterday?</b><br><ul><li>Simple item</li></ul>';
		const md = convertHtmlToMarkdown(div);
		expect(md).toContain('## 1. What did I do yesterday?');
		expect(md).toContain('- Simple item');
	});
});
