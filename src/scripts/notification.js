(function (global) {
	const root = global || (typeof window !== 'undefined' ? window : globalThis);
	const CONTAINER_ID = 'scrum-helper-toast-container';
	const TOAST_ID = 'scrum-helper-toast';
	const DISPLAY_DURATION = 2500;

	let dismissTimer = null;

	function clearDismissTimer() {
		if (dismissTimer) {
			clearTimeout(dismissTimer);
			dismissTimer = null;
		}
	}

	function ensureContainer() {
		if (typeof document === 'undefined') {
			return null;
		}

		let container = document.getElementById(CONTAINER_ID);
		if (!container) {
			container = document.createElement('div');
			container.id = CONTAINER_ID;
			container.style.position = 'fixed';
			container.style.top = '12px';
			container.style.left = '50%';
			container.style.transform = 'translateX(-50%)';
			container.style.zIndex = '2147483647';
			container.style.pointerEvents = 'none';
			container.setAttribute('aria-live', 'polite');
			container.setAttribute('aria-atomic', 'true');
			document.body.appendChild(container);
		}

		return container;
	}

	function removeToast() {
		clearDismissTimer();
		const existingToast = document.getElementById(TOAST_ID);
		if (existingToast && existingToast.parentNode) {
			existingToast.parentNode.removeChild(existingToast);
		}
	}

	function showToast(message, variant) {
		if (typeof document === 'undefined' || !message) {
			return;
		}

		const container = ensureContainer();
		if (!container) {
			return;
		}

		removeToast();

		const toast = document.createElement('div');
		toast.id = TOAST_ID;
		toast.style.pointerEvents = 'auto';
		toast.style.padding = '10px 16px';
		toast.style.borderRadius = '8px';
		toast.style.fontSize = '13px';
		toast.style.fontWeight = '600';
		toast.style.color = '#ffffff';
		toast.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.25)';
		toast.style.maxWidth = '320px';
		toast.style.wordBreak = 'break-word';
		toast.style.textAlign = 'center';

		if (variant === 'success') {
			toast.style.background = '#16a34a';
		} else if (variant === 'error') {
			toast.style.background = '#dc2626';
		} else {
			toast.style.background = '#334155';
		}

		toast.textContent = String(message);
		container.appendChild(toast);

		dismissTimer = setTimeout(() => {
			removeToast();
		}, DISPLAY_DURATION);
	}

	root.ScrumHelperNotifications = {
		showSuccess(message) {
			showToast(message, 'success');
		},
		showError(message) {
			showToast(message, 'error');
		},
		showInfo(message) {
			showToast(message, 'info');
		},
		dismiss() {
			removeToast();
		},
	};
})(typeof window !== 'undefined' ? window : globalThis);