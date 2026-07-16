(function () {
	const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
	if (isExtension) {
		window.isTauri = false;
		return;
	}

	window.isTauri = true;

	// Display JavaScript errors as overlay in Tauri
	window.addEventListener('error', function (event) {
		const div = document.createElement('div');
		div.style.position = 'fixed';
		div.style.top = '0';
		div.style.left = '0';
		div.style.width = '100%';
		div.style.height = '100%';
		div.style.backgroundColor = 'rgba(220, 38, 38, 0.95)';
		div.style.color = 'white';
		div.style.padding = '20px';
		div.style.zIndex = '999999';
		div.style.fontFamily = 'monospace';
		div.style.overflow = 'auto';
		const h1 = document.createElement('h1');
		h1.style.fontSize = '20px';
		h1.style.fontWeight = 'bold';
		h1.style.marginBottom = '10px';
		h1.textContent = 'JavaScript Error Detected';
		div.appendChild(h1);

		const p1 = document.createElement('p');
		p1.style.marginBottom = '5px';
		const b1 = document.createElement('b');
		b1.textContent = 'Message: ';
		p1.appendChild(b1);
		p1.appendChild(document.createTextNode(event.message));
		div.appendChild(p1);

		const p2 = document.createElement('p');
		p2.style.marginBottom = '15px';
		const b2 = document.createElement('b');
		b2.textContent = 'Source: ';
		p2.appendChild(b2);
		p2.appendChild(document.createTextNode(event.filename + ':' + event.lineno + ':' + event.colno));
		div.appendChild(p2);

		const pre = document.createElement('pre');
		pre.style.background = 'rgba(0,0,0,0.5)';
		pre.style.padding = '10px';
		pre.style.borderRadius = '5px';
		pre.textContent = event.error ? event.error.stack : '';
		div.appendChild(pre);

		document.body.appendChild(div);
	});

	// Load locales synchronously from local directory
	let localeData = null;
	try {
		const xhr = new XMLHttpRequest();
		xhr.open('GET', '_locales/en/messages.json', false);
		xhr.send();
		if (xhr.status === 200) {
			localeData = JSON.parse(xhr.responseText);
		}
	} catch (e) {
		console.error('Failed to load locale data for Tauri:', e);
	}

	const i18nMock = {
		getMessage: function (key, substitutions) {
			if (!localeData) return '';
			const item = localeData[key];
			if (!item) return '';
			let message = item.message;
			if (substitutions) {
				const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
				subs.forEach((sub, index) => {
					message = message.replace(new RegExp('\\$' + (index + 1), 'g'), sub);
				});
			}
			return message;
		},
	};

	const storageListeners = [];
	const storageOnChangedMock = {
		addListener: function (callback) {
			if (typeof callback === 'function' && !storageListeners.includes(callback)) {
				storageListeners.push(callback);
			}
		},
		removeListener: function (callback) {
			const index = storageListeners.indexOf(callback);
			if (index !== -1) {
				storageListeners.splice(index, 1);
			}
		},
	};

	const storageLocalMock = {
		get: function (keys, callback) {
			const promise = new Promise((resolve) => {
				const defaults =
					typeof keys === 'string'
						? { [keys]: null }
						: Array.isArray(keys)
							? keys.reduce((acc, k) => {
									acc[k] = null;
									return acc;
								}, {})
							: keys || {};
				const result = {};
				for (const key in defaults) {
					const val = localStorage.getItem(key);
					let parsedVal;
					try {
						parsedVal = val !== null ? JSON.parse(val) : defaults[key];
					} catch (e) {
						parsedVal = val;
					}
					result[key] = parsedVal;
				}
				resolve(result);
			});
			if (typeof callback === 'function') {
				promise.then(callback);
			}
			return promise;
		},
		set: function (obj, callback) {
			const promise = new Promise((resolve) => {
				const changes = {};
				for (const key in obj) {
					const oldValStr = localStorage.getItem(key);
					let oldVal;
					try {
						oldVal = oldValStr !== null ? JSON.parse(oldValStr) : undefined;
					} catch (e) {
						oldVal = oldValStr;
					}
					const newVal = obj[key];
					localStorage.setItem(key, JSON.stringify(newVal));
					changes[key] = { oldValue: oldVal, newValue: newVal };
				}
				// Trigger listeners
				storageListeners.forEach((listener) => {
					try {
						listener(changes, 'local');
					} catch (e) {
						console.error('Error in storage onChanged listener:', e);
					}
				});
				resolve();
			});
			if (typeof callback === 'function') {
				promise.then(callback);
			}
			return promise;
		},
		remove: function (keys, callback) {
			const promise = new Promise((resolve) => {
				const keysArr = Array.isArray(keys) ? keys : [keys];
				const changes = {};
				keysArr.forEach((k) => {
					const oldValStr = localStorage.getItem(k);
					let oldVal;
					try {
						oldVal = oldValStr !== null ? JSON.parse(oldValStr) : undefined;
					} catch (e) {
						oldVal = oldValStr;
					}
					localStorage.removeItem(k);
					changes[k] = { oldValue: oldVal, newValue: undefined };
				});
				// Trigger listeners
				storageListeners.forEach((listener) => {
					try {
						listener(changes, 'local');
					} catch (e) {
						console.error('Error in storage onChanged listener:', e);
					}
				});
				resolve();
			});
			if (typeof callback === 'function') {
				promise.then(callback);
			}
			return promise;
		},
		clear: function (callback) {
			const promise = new Promise((resolve) => {
				const changes = {};
				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					const oldValStr = localStorage.getItem(key);
					let oldVal;
					try {
						oldVal = oldValStr !== null ? JSON.parse(oldValStr) : undefined;
					} catch (e) {
						oldVal = oldValStr;
					}
					changes[key] = { oldValue: oldVal, newValue: undefined };
				}
				localStorage.clear();
				// Trigger listeners
				storageListeners.forEach((listener) => {
					try {
						listener(changes, 'local');
					} catch (e) {
						console.error('Error in storage onChanged listener:', e);
					}
				});
				resolve();
			});
			if (typeof callback === 'function') {
				promise.then(callback);
			}
			return promise;
		},
	};

	const runtimeMock = {
		id: 'tauri-scrum-helper',
		getURL: function (path) {
			return path;
		},
		sendMessage: function () {
			return Promise.resolve();
		},
		onMessage: {
			addListener: function () {},
			removeListener: function () {},
		},
	};

	const tabsMock = {
		query: function () {
			return Promise.resolve([]);
		},
		sendMessage: function () {
			return Promise.resolve();
		},
	};

	const actionMock = {
		setPopup: function () {},
		openPopup: function () {},
	};

	window.chrome = {
		runtime: runtimeMock,
		storage: {
			local: storageLocalMock,
			onChanged: storageOnChangedMock,
		},
		i18n: i18nMock,
		tabs: tabsMock,
		action: actionMock,
	};

	window.browser = window.chrome;
})();
