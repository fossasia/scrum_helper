import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('i18n Localization Integrity', () => {
	const localesDir = path.resolve(__dirname, '../src/_locales');
	const enPath = path.join(localesDir, 'en', 'messages.json');
	const enMessages = JSON.parse(fs.readFileSync(enPath, 'utf8'));
	const enKeys = Object.keys(enMessages);

	const availableLocales = fs
		.readdirSync(localesDir)
		.filter((dir) => fs.statSync(path.join(localesDir, dir)).isDirectory() && dir !== 'en');

	it('English locale contains valid message definitions', () => {
		expect(enKeys.length).toBeGreaterThan(0);
		for (const key of enKeys) {
			expect(enMessages[key]).toHaveProperty('message');
			expect(typeof enMessages[key].message).toBe('string');
			expect(enMessages[key].message.trim().length).toBeGreaterThan(0);
		}
	});

	for (const locale of availableLocales) {
		describe(`Locale [${locale}]`, () => {
			const localePath = path.join(localesDir, locale, 'messages.json');

			it('parses as valid JSON', () => {
				expect(fs.existsSync(localePath)).toBe(true);
				const content = fs.readFileSync(localePath, 'utf8');
				expect(() => JSON.parse(content)).not.toThrow();
			});

			it('contains all message keys present in en/messages.json', () => {
				const localeMessages = JSON.parse(fs.readFileSync(localePath, 'utf8'));
				const localeKeys = Object.keys(localeMessages);
				const missingKeys = enKeys.filter((key) => !localeKeys.includes(key));

				expect(missingKeys).toEqual([]);
			});

			it('has non-empty message strings for all keys', () => {
				const localeMessages = JSON.parse(fs.readFileSync(localePath, 'utf8'));
				for (const key of enKeys) {
					if (localeMessages[key]) {
						expect(typeof localeMessages[key].message).toBe('string');
						expect(localeMessages[key].message.trim().length).toBeGreaterThan(0);
					}
				}
			});

			it('matches required placeholders from English source', () => {
				const localeMessages = JSON.parse(fs.readFileSync(localePath, 'utf8'));
				for (const key of enKeys) {
					const enMsg = enMessages[key].message;
					const locMsg = localeMessages[key]?.message;

					if (!locMsg) continue;

					// Match $1, $2, etc. placeholders
					const enPlaceholders = (enMsg.match(/\$[1-9]/g) || []).sort();
					const locPlaceholders = (locMsg.match(/\$[1-9]/g) || []).sort();

					expect(
						locPlaceholders,
						`Placeholder mismatch in key "${key}" for locale "${locale}"`
					).toEqual(enPlaceholders);
				}
			});
		});
	}
});
