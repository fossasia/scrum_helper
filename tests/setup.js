import { vi } from 'vitest';

// Define WebExtension API mocks
const storageMock = {
	local: {
		get: vi.fn().mockResolvedValue({}),
		set: vi.fn().mockResolvedValue({}),
		remove: vi.fn().mockResolvedValue({}),
		clear: vi.fn().mockResolvedValue({}),
	},
	onChanged: {
		addListener: vi.fn(),
		removeListener: vi.fn(),
	},
};

const runtimeMock = {
	id: 'test-scrum-helper',
	getURL: (path) => path,
	sendMessage: vi.fn().mockResolvedValue({}),
	onMessage: {
		addListener: vi.fn(),
		removeListener: vi.fn(),
	},
};

const actionMock = {
	setPopup: vi.fn(),
	openPopup: vi.fn(),
};

const i18nMock = {
	getMessage: vi.fn((key) => key),
};

const tabsMock = {
	query: vi.fn().mockResolvedValue([]),
	sendMessage: vi.fn().mockResolvedValue({}),
};

global.browser = {
	storage: storageMock,
	runtime: runtimeMock,
	action: actionMock,
	i18n: i18nMock,
	tabs: tabsMock,
};

global.chrome = global.browser;
global.isTauri = false;
