const osName = document.getElementById('os-name');
const downloadTitle = document.getElementById('download-title');
const downloadDescription = document.getElementById('download-description');

const userAgent = navigator.userAgent.toLowerCase();
const platform = navigator.platform.toLowerCase();

if (userAgent.includes('windows')) {
	osName.textContent = 'Windows';
	downloadTitle.textContent = 'Download for Windows';
	downloadDescription.textContent = 'Download the Windows installer (.msi) from the latest release.';
} else if (userAgent.includes('macintosh') || userAgent.includes('mac os')) {
	osName.textContent = 'macOS';
	downloadTitle.textContent = 'Download for macOS';
	downloadDescription.textContent = 'Download the macOS installer (.dmg) from the latest release.';
} else if (userAgent.includes('linux') || platform.includes('linux')) {
	osName.textContent = 'Linux';
	downloadTitle.textContent = 'Download for Linux';
	downloadDescription.textContent = 'Download the Linux application (.AppImage) from the latest release.';
} else {
	osName.textContent = 'your operating system';
	downloadTitle.textContent = 'Download Scrum Helper';
	downloadDescription.textContent = 'Choose the appropriate installer from the latest release.';
}
