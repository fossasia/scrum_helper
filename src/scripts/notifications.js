const NotificationSystem = {
	_activeToast: null,
	_activeTimer: null,
	_activeAnimTimer: null,

	showToast(message, type = 'info', duration = 3000, onDismiss = null) {
		console.log(`[Notification] ${type.toUpperCase()}: ${message}`);
		this._showCustomToast(message, type, duration, onDismiss);
	},

	_showCustomToast(message, type, duration, onDismiss) {
		this._dismissCurrent();

		const containerId = 'scrum-helper-toast-container';
		let container = document.getElementById(containerId);

		if (!container) {
			container = document.createElement('div');
			container.id = containerId;
			container.style.cssText = `
				position: fixed;
				top: 24px;
				left: 50%;
				transform: translateX(-50%);
				z-index: 10000;
				display: flex;
				flex-direction: column;
				gap: 8px;
				pointer-events: none;
			`;
			document.body.appendChild(container);
		}

		const toast = document.createElement('div');
		toast.className = `scrum-toast scrum-toast-${type}`;

		let bg = '#3b82f6';
		let icon = 'fa-info-circle';

		if (type === 'error') {
			bg = '#dc2626';
			icon = 'fa-exclamation-circle';
		} else if (type === 'success') {
			bg = '#10b981';
			icon = 'fa-check-circle';
		}

		toast.style.cssText = `
			background: ${bg};
			color: white;
			padding: 12px 20px;
			border-radius: 12px;
			font-weight: 600;
			font-size: 14px;
			box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
			display: flex;
			align-items: center;
			gap: 10px;
			pointer-events: auto;
			animation: toast-in 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
			min-width: 280px;
			max-width: 90vw;
		`;

		toast.innerHTML = `<i class="fa ${icon}"></i><span>${message}</span>`;

		container.appendChild(toast);
		this._activeToast = toast;

		this._activeTimer = setTimeout(() => {
			toast.style.animation = 'toast-out 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045)';
			toast.style.opacity = '0';
			this._activeAnimTimer = setTimeout(() => {
				if (toast.parentNode) {
					toast.parentNode.removeChild(toast);
				}
				if (container.children.length === 0 && container.parentNode) {
					container.parentNode.removeChild(container);
				}
				this._activeToast = null;
				this._activeTimer = null;
				this._activeAnimTimer = null;
				if (typeof onDismiss === 'function') {
					onDismiss();
				}
			}, 300);
		}, duration);
	},

	_dismissCurrent() {
		if (this._activeTimer) {
			clearTimeout(this._activeTimer);
			this._activeTimer = null;
		}
		if (this._activeAnimTimer) {
			clearTimeout(this._activeAnimTimer);
			this._activeAnimTimer = null;
		}
		if (this._activeToast && this._activeToast.parentNode) {
			const container = this._activeToast.parentNode;
			container.removeChild(this._activeToast);
			if (container.children.length === 0 && container.parentNode) {
				container.parentNode.removeChild(container);
			}
		}
		this._activeToast = null;
	},
};

if (!document.getElementById('scrum-helper-toast-styles')) {
	const style = document.createElement('style');
	style.id = 'scrum-helper-toast-styles';
	style.textContent = `
		@keyframes toast-in {
			from { opacity: 0; transform: translateY(-20px) scale(0.9); }
			to { opacity: 1; transform: translateY(0) scale(1); }
		}
		@keyframes toast-out {
			from { opacity: 1; transform: translateY(0) scale(1); }
			to { opacity: 0; transform: scale(0.95); }
		}
	`;
	document.head.appendChild(style);
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = NotificationSystem;
}
