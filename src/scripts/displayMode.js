function getDefaultDisplayMode() {
	return typeof browser.sidePanel?.open === 'function' ? 'sidePanel' : 'popup';
}
