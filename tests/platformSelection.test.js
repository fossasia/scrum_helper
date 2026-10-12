import { describe, it, expect } from 'vitest';
import '../src/scripts/main.js';

describe('platformSelection and reportIdentityUtils', () => {
	it('normalizePlatforms preserves empty array when all platforms are unselected', () => {
		const result = window.reportIdentityUtils.normalizePlatforms([]);
		expect(result).toEqual([]);
	});

	it('normalizePlatforms returns deduplicated sorted array of selected platforms', () => {
		const result = window.reportIdentityUtils.normalizePlatforms(['gitlab', 'github', 'gitlab']);
		expect(result).toEqual(['github', 'gitlab']);
	});

	it('normalizePlatforms returns empty array when platforms is undefined and fallback is empty', () => {
		const result = window.reportIdentityUtils.normalizePlatforms(undefined, '');
		expect(result).toEqual([]);
	});

	it('normalizePlatforms uses fallback if platforms is null or undefined and fallback provided', () => {
		const result = window.reportIdentityUtils.normalizePlatforms(null, 'github');
		expect(result).toEqual(['github']);
	});

	it('buildReportIdentity correctly handles empty platforms', () => {
		const identity = window.reportIdentityUtils.buildReportIdentity({
			selectedPlatforms: [],
			platform: '',
		});
		expect(identity.platforms).toEqual([]);
	});

	it('buildReportIdentity correctly captures multiple active platforms', () => {
		const identity = window.reportIdentityUtils.buildReportIdentity({
			selectedPlatforms: ['gitlab', 'codeberg'],
			platform: 'gitlab',
			githubUsername: 'ghuser',
			gitlabUsername: 'gluser',
			codebergUsername: 'cbuser',
		});
		expect(identity.platforms).toEqual(['codeberg', 'gitlab']);
		expect(identity.usernames.gitlab).toBe('gluser');
		expect(identity.usernames.codeberg).toBe('cbuser');
	});
});
