const fs = require('fs');
const path = require('path');

// Folders
const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const chromeDir = path.join(distDir, 'chrome');
const firefoxDir = path.join(distDir, 'firefox');

// Helper: copy directory recursively (ignore manifests folder)
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (let entry of entries) {
        if (entry.name === 'manifests') continue; // Don't copy the manifests folder itself
        
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('Building cross-browser extensions...');

// 1. Clean and prepare dist folders
if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(chromeDir, { recursive: true });
fs.mkdirSync(firefoxDir, { recursive: true });

// 2. Copy source code to both targets
console.log('Copying source files...');
copyDir(srcDir, chromeDir);
copyDir(srcDir, firefoxDir);

// 3. Inject the specific manifests into the roots of the dist folders
console.log('Injecting browser-specific manifests...');
fs.copyFileSync(
    path.join(srcDir, 'manifests', 'chrome.json'), 
    path.join(chromeDir, 'manifest.json')
);
fs.copyFileSync(
    path.join(srcDir, 'manifests', 'firefox.json'), 
    path.join(firefoxDir, 'manifest.json')
);

console.log('Build complete!');
console.log('=> Chrome version ready in : dist/chrome');
console.log('=> Firefox version ready in: dist/firefox');
