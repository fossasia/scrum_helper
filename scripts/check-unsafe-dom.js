const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(projectRoot, 'src');

const ignoredPathFragments = [
	`${path.sep}fontawesome${path.sep}`,
	`${path.sep}materialize${path.sep}`,
	`${path.sep}webfonts${path.sep}`,
];

const checks = [
	{ name: 'innerHTML', regex: /\binnerHTML\b/ },
	{ name: 'outerHTML', regex: /\bouterHTML\b/ },
	{ name: 'document.write', regex: /\bdocument\.write\s*\(/ },
];

function shouldSkip(filePath) {
	if (!filePath.endsWith('.js')) return true;
	if (filePath.endsWith('.min.js')) return true;
	return ignoredPathFragments.some((fragment) => filePath.includes(fragment));
}

function walk(dirPath, files = []) {
	const entries = fs.readdirSync(dirPath, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			walk(fullPath, files);
		} else {
			files.push(fullPath);
		}
	}
	return files;
}

function getViolations(filePath) {
	const content = fs.readFileSync(filePath, 'utf8');
	const lines = content.split(/\r?\n/);
	const violations = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		for (const check of checks) {
			if (check.regex.test(line)) {
				violations.push({
					line: i + 1,
					pattern: check.name,
				});
			}
		}
	}

	return violations;
}

const files = walk(srcRoot).filter((filePath) => !shouldSkip(filePath));
const allViolations = [];

for (const filePath of files) {
	const violations = getViolations(filePath);
	if (violations.length > 0) {
		allViolations.push({ filePath, violations });
	}
}

if (allViolations.length > 0) {
	console.error('Unsafe DOM API usage detected:');
	for (const { filePath, violations } of allViolations) {
		const relativePath = path.relative(projectRoot, filePath);
		for (const violation of violations) {
			console.error(`- ${relativePath}:${violation.line} (${violation.pattern})`);
		}
	}
	console.error('\nPlease replace these with safe DOM APIs (textContent/createElement/appendChild) or sanitized rendering.');
	process.exit(1);
}

console.log('Unsafe DOM API guard passed.');
