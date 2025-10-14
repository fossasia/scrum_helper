#!/usr/bin/env node

/**
 * Locale Duplication Validator
 * 
 * This script prevents duplicate locale folders that map to the same language.
 * It helps avoid conflicts in translation management systems like Weblate.
 * 
 * For example, both 'zh_CN' and 'zh_Hans' map to "Chinese (Simplified)",
 * which causes duplication issues.
 */

const fs = require('fs');
const path = require('path');

// Map of locale codes that should be considered duplicates
// Key: canonical locale to keep, Value: array of duplicate codes to avoid
const LOCALE_DUPLICATES = {
	zh_CN: ['zh_Hans', 'zh-CN', 'zh-Hans'],
	zh_TW: ['zh_Hant', 'zh-TW', 'zh-Hant'],
	pt_BR: ['pt-BR'],
	en: ['en_US', 'en-US'],
};

// Flatten the duplicate map to check against
const getAllDuplicates = () => {
	const duplicates = {};
	for (const [canonical, alternates] of Object.entries(LOCALE_DUPLICATES)) {
		for (const alt of alternates) {
			duplicates[alt] = canonical;
		}
	}
	return duplicates;
};

const validateLocales = () => {
	const localesDir = path.join(__dirname, '..', 'src', '_locales');
	
	if (!fs.existsSync(localesDir)) {
		console.error('❌ Error: _locales directory not found');
		process.exit(1);
	}

	const folders = fs.readdirSync(localesDir, { withFileTypes: true })
		.filter(dirent => dirent.isDirectory())
		.map(dirent => dirent.name);

	const duplicateMap = getAllDuplicates();
	const errors = [];
	const warnings = [];

	// Check for known duplicates
	for (const folder of folders) {
		if (duplicateMap[folder]) {
			errors.push(
				`❌ Duplicate locale detected: '${folder}' should use '${duplicateMap[folder]}' instead`
			);
		}
	}

	// Check if multiple canonical versions exist for the same language
	const canonicalPresent = {};
	for (const [canonical, alternates] of Object.entries(LOCALE_DUPLICATES)) {
		if (folders.includes(canonical)) {
			canonicalPresent[canonical] = true;
		}
		for (const alt of alternates) {
			if (folders.includes(alt)) {
				if (canonicalPresent[canonical]) {
					errors.push(
						`❌ Conflict: Both '${canonical}' and '${alt}' exist. Keep only '${canonical}'`
					);
				}
			}
		}
	}

	// Validate each locale folder has messages.json
	for (const folder of folders) {
		const messagesPath = path.join(localesDir, folder, 'messages.json');
		if (!fs.existsSync(messagesPath)) {
			warnings.push(`⚠️  Warning: '${folder}' is missing messages.json`);
		}
	}

	// Report results
	console.log('\n🔍 Locale Validation Report\n');
	console.log(`Found ${folders.length} locale folder(s): ${folders.join(', ')}`);
	console.log('');

	if (errors.length > 0) {
		console.error('Errors found:\n');
		errors.forEach(err => console.error(err));
		console.error('\n💡 Tip: Use the canonical locale codes defined in Chrome i18n standards.');
		console.error('   See: https://developer.chrome.com/docs/extensions/reference/api/i18n\n');
		process.exit(1);
	}

	if (warnings.length > 0) {
		console.warn('Warnings:\n');
		warnings.forEach(warn => console.warn(warn));
		console.warn('');
	}

	console.log('✅ All locale folders are valid. No duplicates detected.\n');
	process.exit(0);
};

// Run validation
validateLocales();
