function debounce(func, wait) {
	let timeout;
	return function (...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}

function getToday() {
	const today = new Date();
	return today.toISOString().split('T')[0];
}

function getYesterday() {
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	return yesterday.toISOString().split('T')[0];
}

function applyI18n() {
	document.querySelectorAll('[data-i18n]').forEach((el) => {
		const key = el.getAttribute('data-i18n');
		const message = chrome.i18n.getMessage(key);
		if (message) {
			// Use innerHTML to support simple formatting like <b> in tooltips
			if (el.classList.contains('tooltip-bubble') || el.classList.contains('cache-info')) {
				el.innerHTML = message;
			} else {
				el.textContent = message;
			}
		}
	});

	document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
		const key = el.getAttribute('data-i18n-placeholder');
		const message = chrome.i18n.getMessage(key);
		if (message) {
			el.placeholder = message;
		}
	});

	document.querySelectorAll('[data-i18n-title]').forEach((el) => {
		const key = el.getAttribute('data-i18n-title');
		const message = chrome.i18n.getMessage(key);
		if (message) {
			el.title = message;
		}
	});
}

                    <div class="repository-dropdown-item" data-repo-name="${repo.fullName}">
                        <div class="repo-name">
                            <span>${repo.name}</span>
                            ${repo.language ? `<span class="repo-language">${repo.language}</span>` : ''}
                            ${repo.stars ? `<span class="repo-stars"><i class="fa fa-star"></i> ${repo.stars}</span>` : ''}
                        </div>
                        <div class="repo-info">
                            ${repo.description ? `<span class="repo-desc">${repo.description.substring(0, 50)}${repo.description.length > 50 ? '...' : ''}</span>` : ''}
                        </div>
                    </div>
                `,
					)
					.join('');

				repoDropdown.querySelectorAll('.repository-dropdown-item').forEach((item) => {
					item.addEventListener('click', (e) => {
						e.stopPropagation();
						fnSelectedRepos(item.dataset.repoName);
					});
				});
			}
			highlightedIndex = -1;
			showDropdown();
		}

		function fnSelectedRepos(repoFullName) {
			if (!selectedRepos.includes(repoFullName)) {
				selectedRepos.push(repoFullName);
				updateRepoDisplay();
				saveRepoSelection();
			}

			repoSearch.value = '';
			filterAndDisplayRepos('');
			programmaticFocus = true;
			repoSearch.focus();
		}

		function removeRepo(repoFullName) {
			selectedRepos = selectedRepos.filter((name) => name !== repoFullName);
			updateRepoDisplay();
			saveRepoSelection();

			if (repoSearch.value) {
				filterAndDisplayRepos(repoSearch.value.toLowerCase());
			}
		}

		function updateRepoDisplay() {
			if (selectedRepos.length === 0) {
				repoTags.innerHTML = `<span class="text-xs text-gray-500 select-none" id="repoPlaceholder">${chrome.i18n.getMessage('repoPlaceholder')}</span>`;
				repoCount.textContent = chrome.i18n.getMessage('repoCountNone');
			} else {
				repoTags.innerHTML = selectedRepos
					.map((repoFullName) => {
						const repoName = repoFullName.split('/')[1] || repoFullName;
						return `
                        <span class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full" style="margin:5px;">
                            ${repoName}
                            <button type="button" class="ml-1 text-blue-600 hover:text-blue-800 remove-repo-btn cursor-pointer" data-repo-name="${repoFullName}">
                                <i class="fa fa-times"></i>
                            </button>
                        </span>
                    `;
					})
					.join(' ');
				repoTags.querySelectorAll('.remove-repo-btn').forEach((btn) => {
					btn.addEventListener('click', (e) => {
						e.stopPropagation();
						const repoFullName = btn.dataset.repoName;
						removeRepo(repoFullName);
					});
				});
				repoCount.textContent = chrome.i18n.getMessage('repoCount', [selectedRepos.length]);
			}
		}

		function saveRepoSelection() {
			const cleanedRepos = selectedRepos.filter((repo) => repo !== null);
			chrome.storage.local.set({
				selectedRepos: cleanedRepos,
				githubCache: null,
			});
		}

		function showDropdown() {
			repoDropdown.classList.remove('hidden');
		}

		function hideDropdown() {
			repoDropdown.classList.add('hidden');
			highlightedIndex = -1;
		}

		function updateHighlight(items) {
			items.forEach((item, index) => {
				item.classList.toggle('highlighted', index === highlightedIndex);
			});

			if (highlightedIndex >= 0 && items[highlightedIndex]) {
				items[highlightedIndex].scrollIntoView({ block: 'nearest' });
			}
		}

		window.removeRepo = removeRepo;

		chrome.storage.local.get(['platform', 'githubUsername'], (items) => {
			const platform = items.platform || 'github';
			const platformUsernameKey = `${platform}Username`;
			const username = items[platformUsernameKey];
			if (username && useRepoFilter.checked && availableRepos.length === 0) {
				setTimeout(() => loadRepos(), 1000);
			}
		});
	}
});

const cacheInput = document.getElementById('cacheInput');
if (cacheInput) {
	chrome.storage.local.get(['cacheInput'], (result) => {
		if (result.cacheInput) {
			cacheInput.value = result.cacheInput;
		} else {
			cacheInput.value = 10;
		}
	});

	cacheInput.addEventListener('blur', function () {
		let ttlValue = Number.parseInt(this.value, 10);
		if (Number.isNaN(ttlValue) || ttlValue <= 0 || this.value.trim() === '') {
			ttlValue = 10;
			this.value = ttlValue;
			this.style.borderColor = '#ef4444';
		} else if (ttlValue > 1440) {
			ttlValue = 1440;
			this.value = ttlValue;
			this.style.borderColor = '#f59e0b';
		} else {
			this.style.borderColor = '#10b981';
		}

		chrome.storage.local.set({ cacheInput: ttlValue }, () => {
			console.log('Cache TTL saved:', ttlValue, 'minutes');
		});
	});
}

chrome.storage.local.get(['platform'], (result) => {
	const platform = result.platform || 'github';
	platformSelect.value = platform;
	updatePlatformUI(platform);
});

// Update UI for platform
function updatePlatformUI(platform) {
	const usernameLabel = document.getElementById('usernameLabel');
	if (usernameLabel) {
		if (platform === 'gitlab') {
			usernameLabel.setAttribute('data-i18n', 'gitlabUsernameLabel');
		} else {
			usernameLabel.setAttribute('data-i18n', 'githubUsernameLabel');
		}
		const key = usernameLabel.getAttribute('data-i18n');
		const message = chrome.i18n.getMessage(key);
		if (message) {
			usernameLabel.textContent = message;
		}
	}

	const orgSection = document.querySelector('.orgSection');
	if (orgSection) {
		if (platform === 'gitlab') {
			orgSection.classList.add('hidden');
		} else {
			orgSection.classList.remove('hidden');
		}
	}
	const githubOnlySections = document.querySelectorAll('.githubOnlySection');
	githubOnlySections.forEach((el) => {
		if (platform === 'gitlab') {
			el.classList.add('hidden');
		} else {
			el.classList.remove('hidden');
		}
	});
}

platformSelect.addEventListener('change', () => {
	const platform = platformSelect.value;
	chrome.storage.local.set({ platform });
	const platformUsername = document.getElementById('platformUsername');
	if (platformUsername) {
		const currentPlatform = platformSelect.value === 'github' ? 'gitlab' : 'github'; // Get the platform we're switching from
		const currentUsername = platformUsername.value;
		if (currentUsername.trim()) {
			chrome.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
		}
	}

	chrome.storage.local.get([`${platform}Username`], (result) => {
		if (platformUsername) {
			platformUsername.value = result[`${platform}Username`] || '';
		}
	});

	updatePlatformUI(platform);
});

const customDropdown = document.getElementById('customPlatformDropdown');
const dropdownBtn = document.getElementById('platformDropdownBtn');
const dropdownList = document.getElementById('platformDropdownList');
const dropdownSelected = document.getElementById('platformDropdownSelected');
const platformSelectHidden = document.getElementById('platformSelect');

function setPlatformDropdown(value) {
	if (value === 'gitlab') {
		dropdownSelected.innerHTML = '<i class="fab fa-gitlab mr-2"></i> GitLab';
	} else {
		dropdownSelected.innerHTML = '<i class="fab fa-github mr-2"></i> GitHub';
	}

	const platformUsername = document.getElementById('platformUsername');
	if (platformUsername) {
		const currentPlatform = platformSelectHidden.value;
		const currentUsername = platformUsername.value;
		if (currentUsername.trim()) {
			chrome.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
		}
	}

	platformSelectHidden.value = value;
	chrome.storage.local.set({ platform: value });

	chrome.storage.local.get([`${value}Username`], (result) => {
		if (platformUsername) {
			platformUsername.value = result[`${value}Username`] || '';
		}
	});

	updatePlatformUI(value);
}

dropdownBtn.addEventListener('click', (e) => {
	e.stopPropagation();
	customDropdown.classList.toggle('open');
	dropdownList.classList.toggle('hidden');
});

dropdownList.querySelectorAll('li').forEach((item) => {
	item.addEventListener('click', function (e) {
		const newPlatform = this.getAttribute('data-value');
		const currentPlatform = platformSelectHidden.value;

		if (newPlatform !== currentPlatform) {
			const platformUsername = document.getElementById('platformUsername');
			if (platformUsername) {
				const currentUsername = platformUsername.value;
				if (currentUsername.trim()) {
					chrome.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
				}
			}
		}

		setPlatformDropdown(newPlatform);
		customDropdown.classList.remove('open');
		dropdownList.classList.add('hidden');
	});
});

document.addEventListener('click', (e) => {
	if (!customDropdown.contains(e.target)) {
		customDropdown.classList.remove('open');
		dropdownList.classList.add('hidden');
	}
});

// Keyboard navigation
platformDropdownBtn.addEventListener('keydown', (e) => {
	if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
		e.preventDefault();
		customDropdown.classList.add('open');
		dropdownList.classList.remove('hidden');
		dropdownList.querySelector('li').focus();
	}
});
dropdownList.querySelectorAll('li').forEach((item, idx, arr) => {
	item.setAttribute('tabindex', '0');
	item.addEventListener('keydown', function (e) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			(arr[idx + 1] || arr[0]).focus();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			(arr[idx - 1] || arr[arr.length - 1]).focus();
		} else if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			const newPlatform = this.getAttribute('data-value');
			const currentPlatform = platformSelectHidden.value;

			// Save current username for current platform before switching
			if (newPlatform !== currentPlatform) {
				const platformUsername = document.getElementById('platformUsername');
				if (platformUsername) {
					const currentUsername = platformUsername.value;
					if (currentUsername.trim()) {
						chrome.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
					}
				}
			}

			setPlatformDropdown(newPlatform);
			customDropdown.classList.remove('open');
			dropdownList.classList.add('hidden');
			dropdownBtn.focus();
		}
	});
});

// On load, restore platform from storage
chrome.storage.local.get(['platform'], (result) => {
	const platform = result.platform || 'github';
	// Just update the UI without clearing username when restoring from storage
	if (platform === 'gitlab') {
		dropdownSelected.innerHTML = '<i class="fab fa-gitlab mr-2"></i> GitLab';
	} else {
		dropdownSelected.innerHTML = '<i class="fab fa-github mr-2"></i> GitHub';
	}
	platformSelectHidden.value = platform;
	updatePlatformUI(platform);
});

// Tooltip bubble
document.querySelectorAll('.tooltip-container').forEach((container) => {
	const bubble = container.querySelector('.tooltip-bubble');
	if (!bubble) return;

	function positionTooltip() {
		const icon = container.querySelector('.question-icon') || container;
		const rect = icon.getBoundingClientRect();
		const bubbleRect = bubble.getBoundingClientRect();
		const padding = 8;

		let top = rect.top + window.scrollY;
		let left = rect.right + padding + window.scrollX;

		if (left + bubbleRect.width > window.innerWidth - 10) {
			left = rect.left - bubbleRect.width - padding + window.scrollX;
		}
		if (left < 8) left = 8;
		if (top + bubbleRect.height > window.innerHeight - 10) {
			top = rect.top - bubbleRect.height - padding + window.scrollY;
		}
		if (top < 8) top = 8;

		bubble.style.left = left + 'px';
		bubble.style.top = top + 'px';
	}

	container.addEventListener('mouseenter', positionTooltip);
	container.addEventListener('focusin', positionTooltip);
	container.addEventListener('mousemove', positionTooltip);
	container.addEventListener('mouseleave', () => {
		bubble.style.left = '';
		bubble.style.top = '';
	});
	container.addEventListener('focusout', () => {
		bubble.style.left = '';
		bubble.style.top = '';
	});
});

// Radio button click handlers with toggle functionality
document.querySelectorAll('input[name="timeframe"]').forEach((radio) => {
	radio.addEventListener('click', function () {
		if (this.dataset.wasChecked === 'true') {
			this.checked = false;
			this.dataset.wasChecked = 'false';

			const startDateInput = document.getElementById('startingDate');
			const endDateInput = document.getElementById('endingDate');
			startDateInput.readOnly = false;
			endDateInput.readOnly = false;

			chrome.storage.local.set({
				yesterdayContribution: false,
				selectedTimeframe: null,
			});
		} else {
			document.querySelectorAll('input[name="timeframe"]').forEach((r) => {
				r.dataset.wasChecked = 'false';
			});
			this.dataset.wasChecked = 'true';
			toggleRadio(this);
		}
	});

	// Handle clicks on links within scrumReport to open in new tabs
	document.addEventListener(
		'click',
		(e) => {
			const target = e.target.closest('a');
			if (target && target.closest('#scrumReport')) {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				const href = target.getAttribute('href');
				if (href && href.startsWith('http')) {
					chrome.tabs.create({ url: href });
				}
				return false;
			}
		},
		true,
	); // Use capture phase to handle before contentEditable
});

// refresh cache button

document.getElementById('refreshCache').addEventListener('click', async function () {
	const originalText = this.innerHTML;

	this.classList.add('loading');
	this.innerHTML = `<i class="fa fa-refresh fa-spin"></i><span>${chrome.i18n.getMessage('refreshingButton')}</span>`;
	this.disabled = true;

	try {
		// Determine platform
		let platform = 'github';
		try {
			const items = await new Promise((resolve) => {
				chrome.storage.local.get(['platform'], resolve);
			});
			platform = items.platform || 'github';
		} catch (e) {}

		// Clear all caches
		const keysToRemove = ['githubCache', 'repoCache', 'gitlabCache'];
		await new Promise((resolve) => {
			chrome.storage.local.remove(keysToRemove, resolve);
		});

		// Clear the scrum report
		const scrumReport = document.getElementById('scrumReport');
		if (scrumReport) {
			scrumReport.innerHTML = `<p style="text-align: center; color: #666; padding: 20px;">${chrome.i18n.getMessage('cacheClearedMessage')}</p>`;
		}

		if (typeof availableRepos !== 'undefined') {
			availableRepos = [];
		}

		const repoStatus = document.getElementById('repoStatus');
		if (repoStatus) {
			repoStatus.textContent = '';
		}

		this.innerHTML = `<i class="fa fa-check"></i><span>${chrome.i18n.getMessage('cacheClearedButton')}</span>`;
		this.classList.remove('loading');

		// Do NOT trigger report generation automatically

		setTimeout(() => {
			this.innerHTML = originalText;
			this.disabled = false;
		}, 2000);
	} catch (error) {
		console.error('Cache clear failed:', error);
		this.innerHTML = `<i class="fa fa-exclamation-triangle"></i><span>${chrome.i18n.getMessage('cacheClearFailed')}</span>`;
		this.classList.remove('loading');

		setTimeout(() => {
			this.innerHTML = originalText;
			this.disabled = false;
		}, 3000);
	}
});

function toggleRadio(radio) {
	const startDateInput = document.getElementById('startingDate');
	const endDateInput = document.getElementById('endingDate');

	console.log('Toggling radio:', radio.id);

	if (radio.id === 'yesterdayContribution') {
		startDateInput.value = getYesterday();
		endDateInput.value = getToday();
	}

	startDateInput.readOnly = endDateInput.readOnly = true;

	chrome.storage.local.set(
		{
			startingDate: startDateInput.value,
			endingDate: endDateInput.value,
			yesterdayContribution: radio.id === 'yesterdayContribution',
			selectedTimeframe: radio.id,
			githubCache: null, // Clear cache to force new fetch
		},
		() => {
			console.log('State saved, dates:', {
				start: startDateInput.value,
				end: endDateInput.value,
			});

			triggerRepoFetchIfEnabled();
		},
	);
}

async function triggerRepoFetchIfEnabled() {
	if (window.triggerRepoFetchIfEnabled) {
		await window.triggerRepoFetchIfEnabled();
	}
}

// Validate organization only when user is done typing (on blur)
function validateOrgOnBlur(org) {
	console.log('[Org Check] Checking organization on blur:', org);
	fetch(`https://api.github.com/orgs/${org}`)
		.then((res) => {
			console.log('[Org Check] Response status for', org, ':', res.status);
			if (res.status === 404) {
				console.log('[Org Check] Organization not found on GitHub:', org);
				const oldToast = document.getElementById('invalid-org-toast');
				if (oldToast) oldToast.parentNode.removeChild(oldToast);
				const toastDiv = document.createElement('div');
				toastDiv.id = 'invalid-org-toast';
				toastDiv.className = 'toast';
				toastDiv.style.background = '#dc2626';
				toastDiv.style.color = '#fff';
				toastDiv.style.fontWeight = 'bold';
				toastDiv.style.padding = '12px 24px';
				toastDiv.style.borderRadius = '8px';
				toastDiv.style.position = 'fixed';
				toastDiv.style.top = '24px';
				toastDiv.style.left = '50%';
				toastDiv.style.transform = 'translateX(-50%)';
				toastDiv.style.zIndex = '9999';
				toastDiv.innerText = chrome.i18n.getMessage('orgNotFoundMessage');
				document.body.appendChild(toastDiv);
				setTimeout(() => {
					if (toastDiv.parentNode) toastDiv.parentNode.removeChild(toastDiv);
				}, 3000);
				return;
			}
			const oldToast = document.getElementById('invalid-org-toast');
			if (oldToast) oldToast.parentNode.removeChild(oldToast);
			console.log('[Org Check] Organisation exists on GitHub:', org);
			chrome.storage.local.remove(['githubCache', 'repoCache']);
			triggerRepoFetchIfEnabled();
		})
		.catch((err) => {
			console.log('[Org Check] Error validating organisation:', org, err);
			const oldToast = document.getElementById('invalid-org-toast');
			if (oldToast) oldToast.parentNode.removeChild(oldToast);
			const toastDiv = document.createElement('div');
			toastDiv.id = 'invalid-org-toast';
			toastDiv.className = 'toast';
			toastDiv.style.background = '#dc2626';
			toastDiv.style.color = '#fff';
			toastDiv.style.fontWeight = 'bold';
			toastDiv.style.padding = '12px 24px';
			toastDiv.style.borderRadius = '8px';
			toastDiv.style.position = 'fixed';
			toastDiv.style.top = '24px';
			toastDiv.style.left = '50%';
			toastDiv.style.transform = 'translateX(-50%)';
			toastDiv.style.zIndex = '9999';
			toastDiv.innerText = chrome.i18n.getMessage('orgValidationErrorMessage');
			document.body.appendChild(toastDiv);
			setTimeout(() => {
				if (toastDiv.parentNode) toastDiv.parentNode.removeChild(toastDiv);
			}, 3000);
		});
}
