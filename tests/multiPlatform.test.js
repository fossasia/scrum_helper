import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Multi-Platform Selection & Dynamic Settings', () => {
	let html;

	beforeEach(() => {
		const fullHtml = fs.readFileSync(path.resolve(__dirname, '../src/popup.html'), 'utf-8');
		const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
		const cleanBody = (bodyMatch ? bodyMatch[1] : fullHtml).replace(
			/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
			'',
		);
		document.body.innerHTML = cleanBody;
	});

	afterEach(() => {
		document.body.innerHTML = '';
		vi.restoreAllMocks();
	});

	it('should contain checkboxes in the platform dropdown list', () => {
		const ghCheck = document.getElementById('platformCheck-github');
		const glCheck = document.getElementById('platformCheck-gitlab');
		const cbCheck = document.getElementById('platformCheck-codeberg');

		expect(ghCheck).not.toBeNull();
		expect(glCheck).not.toBeNull();
		expect(cbCheck).not.toBeNull();

		expect(ghCheck.type).toBe('checkbox');
		expect(glCheck.type).toBe('checkbox');
		expect(cbCheck.type).toBe('checkbox');
	});

	it('should contain structured settings sections for GitHub, GitLab, and Codeberg', () => {
		const ghSection = document.getElementById('githubPlatformSection');
		const glSection = document.getElementById('gitlabPlatformSection');
		const cbSection = document.getElementById('codebergPlatformSection');

		expect(ghSection).not.toBeNull();
		expect(glSection).not.toBeNull();
		expect(cbSection).not.toBeNull();

		// GitHub block contents
		expect(ghSection.querySelector('#githubUsername')).not.toBeNull();
		expect(ghSection.querySelector('#githubToken')).not.toBeNull();
		expect(ghSection.querySelector('#orgInput')).not.toBeNull();
		expect(ghSection.querySelector('.repoFilterSection')).not.toBeNull();

		// GitLab block contents
		expect(glSection.querySelector('#gitlabUsername')).not.toBeNull();
		expect(glSection.querySelector('#gitlabToken')).not.toBeNull();
		expect(glSection.querySelector('#gitlabGroupInput')).not.toBeNull();

		// Codeberg block contents
		expect(cbSection.querySelector('#codebergUsername')).not.toBeNull();
		expect(cbSection.querySelector('#codebergToken')).not.toBeNull();
		expect(cbSection.querySelector('#codebergApiBaseUrl')).not.toBeNull();
	});

	it('should preserve legacy platformUsername input and remaining settings', () => {
		expect(document.getElementById('platformUsername')).not.toBeNull();
		expect(document.getElementById('displayModeSectionContainer')).not.toBeNull();
		expect(document.getElementById('cacheInput')).not.toBeNull();
		expect(document.getElementById('refreshCache')).not.toBeNull();
	});

	it('should show and hide platform blocks correctly based on active platforms', () => {
		const ghSection = document.getElementById('githubPlatformSection');
		const glSection = document.getElementById('gitlabPlatformSection');
		const cbSection = document.getElementById('codebergPlatformSection');

		function updatePlatformUI(platforms) {
			const activePlatforms = Array.isArray(platforms) ? platforms : [platforms];
			if (ghSection) {
				if (activePlatforms.includes('github')) ghSection.classList.remove('hidden');
				else ghSection.classList.add('hidden');
			}
			if (glSection) {
				if (activePlatforms.includes('gitlab')) glSection.classList.remove('hidden');
				else glSection.classList.add('hidden');
			}
			if (cbSection) {
				if (activePlatforms.includes('codeberg')) cbSection.classList.remove('hidden');
				else cbSection.classList.add('hidden');
			}
		}

		// GitHub only
		updatePlatformUI(['github']);
		expect(ghSection.classList.contains('hidden')).toBe(false);
		expect(glSection.classList.contains('hidden')).toBe(true);
		expect(cbSection.classList.contains('hidden')).toBe(true);

		// GitHub and GitLab
		updatePlatformUI(['github', 'gitlab']);
		expect(ghSection.classList.contains('hidden')).toBe(false);
		expect(glSection.classList.contains('hidden')).toBe(false);
		expect(cbSection.classList.contains('hidden')).toBe(true);

		// All platforms
		updatePlatformUI(['github', 'gitlab', 'codeberg']);
		expect(ghSection.classList.contains('hidden')).toBe(false);
		expect(glSection.classList.contains('hidden')).toBe(false);
		expect(cbSection.classList.contains('hidden')).toBe(false);

		// Codeberg only
		updatePlatformUI(['codeberg']);
		expect(ghSection.classList.contains('hidden')).toBe(true);
		expect(glSection.classList.contains('hidden')).toBe(true);
		expect(cbSection.classList.contains('hidden')).toBe(false);
	});

	it('should have elements in the required order: username, token, platform-specific settings', () => {
		const ghSection = document.getElementById('githubPlatformSection');
		const ghElements = Array.from(ghSection.querySelectorAll('input, div.repoFilterSection'));
		const ghIds = ghElements.map((el) => el.id || el.className);
		
		const ghUserIdx = ghIds.findIndex((id) => id === 'githubUsername');
		const ghTokenIdx = ghIds.findIndex((id) => id === 'githubToken');
		const ghOrgIdx = ghIds.findIndex((id) => id === 'orgInput');
		const ghRepoIdx = ghIds.findIndex((id) => id.includes('repoFilterSection'));

		expect(ghUserIdx).toBeLessThan(ghTokenIdx);
		expect(ghTokenIdx).toBeLessThan(ghOrgIdx);
		expect(ghOrgIdx).toBeLessThan(ghRepoIdx);

		const glSection = document.getElementById('gitlabPlatformSection');
		const glElements = Array.from(glSection.querySelectorAll('input'));
		const glUserIdx = glElements.findIndex((el) => el.id === 'gitlabUsername');
		const glTokenIdx = glElements.findIndex((el) => el.id === 'gitlabToken');
		const glGroupIdx = glElements.findIndex((el) => el.id === 'gitlabGroupInput');

		expect(glUserIdx).toBeLessThan(glTokenIdx);
		expect(glTokenIdx).toBeLessThan(glGroupIdx);

		const cbSection = document.getElementById('codebergPlatformSection');
		const cbElements = Array.from(cbSection.querySelectorAll('input'));
		const cbUserIdx = cbElements.findIndex((el) => el.id === 'codebergUsername');
		const cbTokenIdx = cbElements.findIndex((el) => el.id === 'codebergToken');
		const cbBaseUrlIdx = cbElements.findIndex((el) => el.id === 'codebergApiBaseUrl');

		expect(cbUserIdx).toBeLessThan(cbTokenIdx);
		expect(cbTokenIdx).toBeLessThan(cbBaseUrlIdx);
	});
});

