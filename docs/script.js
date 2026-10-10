// Tailwind CSS Configuration
tailwind.config = {
	theme: {
		extend: {
			colors: {
				brand: {
					50: '#eff6ff',
					100: '#dbeafe',
					200: '#bfdbfe',
					300: '#93c5fd',
					400: '#60a5fa',
					500: '#3b82f6',
					600: '#2563eb',
					700: '#1d4ed8',
					800: '#1e40af',
					900: '#1e3a8a',
				},
			},
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
				display: ['Outfit', 'sans-serif'],
			},
		},
	},
};

document.addEventListener('DOMContentLoaded', () => {
	const osName = document.getElementById('os-name');
	const osIcon = document.getElementById('os-icon');
	const downloadTitle = document.getElementById('download-title');
	const downloadDescription = document.getElementById('download-description');
	const downloadButton = document.getElementById('download-button');

	const userAgent = navigator.userAgent ? navigator.userAgent.toLowerCase() : '';
	const platform = navigator.platform ? navigator.platform.toLowerCase() : '';

	// Detect mobile platforms first to avoid misclassifying iOS as macOS or Android as Linux
	const isMobile =
		/android|iphone|ipad|ipod|windows phone|mobile/i.test(userAgent) ||
		(navigator.maxTouchPoints > 1 && (platform.includes('mac') || userAgent.includes('macintosh')));

	let detectedOS = 'other';
	if (!isMobile) {
		if (userAgent.includes('windows')) {
			detectedOS = 'windows';
		} else if (userAgent.includes('mac') || platform.includes('mac')) {
			detectedOS = 'mac';
		} else if (userAgent.includes('linux')) {
			detectedOS = 'linux';
		}
	}

	if (detectedOS === 'windows') {
		if (osName) osName.innerText = 'Windows Detected';
		if (osIcon) osIcon.className = 'fab fa-windows text-blue-500';
		if (downloadTitle) downloadTitle.innerText = 'Download for Windows';
		if (downloadDescription) {
			downloadDescription.innerText = 'Compatible with Windows 10, Windows 11, and modern 64-bit architectures.';
		}
	} else if (detectedOS === 'mac') {
		if (osName) osName.innerText = 'macOS Detected';
		if (osIcon) osIcon.className = 'fab fa-apple text-slate-700';
		if (downloadTitle) downloadTitle.innerText = 'Download for macOS';
		if (downloadDescription) {
			downloadDescription.innerText = 'Compatible with Apple Silicon (M1/M2/M3) and Intel Macs.';
		}
	} else if (detectedOS === 'linux') {
		if (osName) osName.innerText = 'Linux Detected';
		if (osIcon) osIcon.className = 'fab fa-linux text-amber-500';
		if (downloadTitle) downloadTitle.innerText = 'Download for Linux';
		if (downloadDescription) {
			downloadDescription.innerText = 'Packaged as a universal AppImage and Debian packages for Linux distributions.';
		}
	} else {
		if (osName) osName.innerText = isMobile ? 'Mobile Device' : 'Universal Builds';
		if (osIcon)
			osIcon.className = isMobile ? 'fa-solid fa-mobile-screen text-brand-600' : 'fa-solid fa-laptop text-brand-600';
		if (downloadTitle) downloadTitle.innerText = 'Download Scrum Helper';
		if (downloadDescription) {
			downloadDescription.innerText = isMobile
				? 'Scrum Helper desktop app is available for Windows, macOS, and Linux. Choose a desktop installer below or use a browser extension.'
				: 'Choose the installer package tailored for your operating system below.';
		}
	}

	const LOCAL_DOWNLOADS = {
		windows: {
			url: 'downloads/scrum-helper-setup.exe',
			label: 'Download for Windows (.exe)',
		},
		macArm: {
			url: 'downloads/scrum-helper-arm64.dmg',
			label: 'Download for macOS (Apple Silicon)',
		},
		macIntel: {
			url: 'downloads/scrum-helper-x64.dmg',
			label: 'Download for macOS (Intel)',
		},
		linux: {
			url: 'downloads/scrum-helper.deb',
			label: 'Download for Linux (.deb)',
		},
	};

	// Explicit asset selection helpers with priority and format derivation
	function getWindowsAsset(assets) {
		const exe = assets.find((a) => a.name.toLowerCase().endsWith('.exe'));
		if (exe) return { url: exe.browser_download_url, format: '.exe', label: 'Windows (.exe)' };
		const msi = assets.find((a) => a.name.toLowerCase().endsWith('.msi'));
		if (msi) return { url: msi.browser_download_url, format: '.msi', label: 'Windows (.msi)' };
		return null;
	}

	function getMacAsset(assets) {
		const dmgArm = assets.find((a) => {
			const n = a.name.toLowerCase();
			return n.endsWith('.dmg') && (n.includes('arm64') || n.includes('aarch64'));
		});
		const dmgIntel = assets.find((a) => {
			const n = a.name.toLowerCase();
			return n.endsWith('.dmg') && (n.includes('x64') || n.includes('x86_64') || n.includes('intel'));
		});
		const dmg = assets.find((a) => a.name.toLowerCase().endsWith('.dmg'));
		const tar = assets.find((a) => {
			const n = a.name.toLowerCase();
			return (
				(n.endsWith('.tar.gz') || n.endsWith('.zip')) &&
				(n.includes('darwin') || n.includes('mac') || n.includes('apple'))
			);
		});

		const armItem = dmgArm
			? { url: dmgArm.browser_download_url, format: '.dmg', label: 'macOS Apple Silicon (.dmg)' }
			: null;
		const intelItem = dmgIntel
			? { url: dmgIntel.browser_download_url, format: '.dmg', label: 'macOS Intel (.dmg)' }
			: null;
		const fallbackItem = dmg
			? { url: dmg.browser_download_url, format: '.dmg', label: 'macOS (.dmg)' }
			: tar
				? {
						url: tar.browser_download_url,
						format: tar.name.toLowerCase().endsWith('.zip') ? '.zip' : '.tar.gz',
						label: 'macOS (.dmg)',
					}
				: null;

		if (!armItem && !intelItem && !fallbackItem) return null;
		return {
			arm: armItem || fallbackItem,
			intel: intelItem || fallbackItem,
		};
	}

	function getLinuxAsset(assets) {
		const deb = assets.find((a) => a.name.toLowerCase().endsWith('.deb'));
		if (deb) return { url: deb.browser_download_url, format: '.deb', label: 'Linux (.deb)' };
		const appImage = assets.find((a) => a.name.toLowerCase().endsWith('.appimage'));
		if (appImage) return { url: appImage.browser_download_url, format: '.AppImage', label: 'Linux (.AppImage)' };
		const tar = assets.find((a) => {
			const n = a.name.toLowerCase();
			return n.endsWith('.tar.gz') && n.includes('linux');
		});
		if (tar) return { url: tar.browser_download_url, format: '.tar.gz', label: 'Linux (.tar.gz)' };
		return null;
	}

	function updateDownloadButton(href, iconClass, text, isDirectDownload = true) {
		if (!downloadButton) return;
		downloadButton.href = href;
		if (isDirectDownload) {
			downloadButton.setAttribute('download', '');
			downloadButton.removeAttribute('target');
		} else {
			downloadButton.removeAttribute('download');
			downloadButton.setAttribute('target', '_blank');
		}
		downloadButton.textContent = '';
		const icon = document.createElement('i');
		icon.className = `${iconClass} mr-2 text-xs`;
		downloadButton.appendChild(icon);
		downloadButton.appendChild(document.createTextNode(` ${text}`));
	}

	// Immediately configure primary 1-click download based on detected OS
	if (detectedOS === 'windows') {
		updateDownloadButton(LOCAL_DOWNLOADS.windows.url, 'fa-solid fa-download', LOCAL_DOWNLOADS.windows.label, true);
	} else if (detectedOS === 'mac') {
		updateDownloadButton(LOCAL_DOWNLOADS.macArm.url, 'fa-solid fa-download', LOCAL_DOWNLOADS.macArm.label, true);
	} else if (detectedOS === 'linux') {
		updateDownloadButton(LOCAL_DOWNLOADS.linux.url, 'fa-solid fa-download', LOCAL_DOWNLOADS.linux.label, true);
	} else {
		updateDownloadButton(LOCAL_DOWNLOADS.windows.url, 'fa-solid fa-download', 'Download Desktop App', true);
	}

	async function fetchLatestRelease() {
		try {
			// Search recent releases (up to 15) to locate releases containing desktop assets if available
			const res = await fetch('https://api.github.com/repos/fossasia/scrum_helper/releases?per_page=15');
			if (!res.ok) return;
			const releases = await res.json();

			let winAsset = null;
			let macAsset = null;
			let linuxAsset = null;

			if (Array.isArray(releases)) {
				for (const rel of releases) {
					if (!rel.assets || rel.assets.length === 0) continue;
					const win = getWindowsAsset(rel.assets);
					const mac = getMacAsset(rel.assets);
					const linux = getLinuxAsset(rel.assets);

					if (win || mac || linux) {
						winAsset = win;
						macAsset = mac;
						linuxAsset = linux;
						break;
					}
				}
			}

			// If release assets exist on GitHub Releases, upgrade links
			if (winAsset) {
				const winLink = document.getElementById('win-download');
				const winLabel = document.getElementById('win-download-label');
				if (winLink) winLink.href = winAsset.url;
				if (winLabel) winLabel.textContent = winAsset.label;
				if (detectedOS === 'windows') {
					updateDownloadButton(
						winAsset.url,
						'fa-solid fa-download',
						`Download for Windows (${winAsset.format})`,
						false,
					);
				}
			}

			if (macAsset) {
				const macArmLink = document.getElementById('mac-arm-download');
				const macArmLabel = document.getElementById('mac-arm-download-label');
				const macIntelLink = document.getElementById('mac-intel-download');
				const macIntelLabel = document.getElementById('mac-intel-download-label');
				if (macArmLink && macAsset.arm) macArmLink.href = macAsset.arm.url;
				if (macArmLabel && macAsset.arm) macArmLabel.textContent = macAsset.arm.label;
				if (macIntelLink && macAsset.intel) macIntelLink.href = macAsset.intel.url;
				if (macIntelLabel && macAsset.intel) macIntelLabel.textContent = macAsset.intel.label;

				if (detectedOS === 'mac') {
					const chosen = macAsset.arm || macAsset.intel;
					if (chosen) {
						updateDownloadButton(chosen.url, 'fa-solid fa-download', `Download for macOS (${chosen.format})`, false);
					}
				}
			}

			if (linuxAsset) {
				const linuxLink = document.getElementById('linux-download');
				const linuxLabel = document.getElementById('linux-download-label');
				if (linuxLink) linuxLink.href = linuxAsset.url;
				if (linuxLabel) linuxLabel.textContent = linuxAsset.label;
				if (detectedOS === 'linux') {
					updateDownloadButton(
						linuxAsset.url,
						'fa-solid fa-download',
						`Download for Linux (${linuxAsset.format})`,
						false,
					);
				}
			}
		} catch (err) {
			console.warn('Could not fetch release assets, using local installer packages:', err);
		}
	}
	fetchLatestRelease();

	// Typewriter Effect for the Hero Badge (starts after 1 second of load)
	setTimeout(() => {
		const words = ['seconds.', 'clicks.', 'one go.'];
		const badge = document.getElementById('hero-typing-badge');
		if (!badge) return;
		if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		let wordIndex = 0;
		let charIndex = badge.textContent.length;
		let isDeleting = true;

		function type() {
			const currentWord = words[wordIndex];
			const fullText = badge.textContent;

			if (isDeleting) {
				badge.textContent = fullText.slice(0, -1);
				if (badge.textContent === '') {
					isDeleting = false;
					charIndex = 0;
					setTimeout(type, 300); // pause before typing next word
				} else {
					setTimeout(type, 80);
				}
			} else {
				badge.textContent = currentWord.slice(0, charIndex + 1);
				charIndex++;
				if (charIndex === currentWord.length) {
					// finished typing word
					isDeleting = true;
					wordIndex = (wordIndex + 1) % words.length;
					setTimeout(type, 3000); // wait 3 seconds before deleting
				} else {
					setTimeout(type, 100);
				}
			}
		}

		type();
	}, 1000);
});
