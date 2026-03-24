describe('EmailClientAdapter utility/helper functions', () => {
	function loadAdapter() {
		jest.resetModules();
		document.body.innerHTML = '';
		delete window.emailClientAdapter;
		require('../src/scripts/emailClientAdapter.js');
		return window.emailClientAdapter;
	}

	test('dispatchElementEvents dispatches standard and keyboard events', () => {
		const adapter = loadAdapter();
		const element = document.createElement('div');
		const events = [];

		element.addEventListener('input', () => events.push('input'));
		element.addEventListener('change', () => events.push('change'));
		element.addEventListener('keydown', () => events.push('keydown'));
		element.addEventListener('keyup', () => events.push('keyup'));

		adapter.dispatchElementEvents(element, ['input', 'change'], true);

		expect(events).toEqual(['input', 'keydown', 'keyup', 'change', 'keydown', 'keyup']);
	});

	test('dispatchElementEvents safely handles null element', () => {
		const adapter = loadAdapter();
		expect(() => adapter.dispatchElementEvents(null, ['input'])).not.toThrow();
	});

	test('injectContent returns false for missing element', () => {
		const adapter = loadAdapter();
		expect(adapter.injectContent(null, 'hello', 'input')).toBe(false);
	});

	test('injectContent sets HTML and dispatches configured event for default clients', () => {
		const adapter = loadAdapter();
		jest.spyOn(adapter, 'detectClient').mockReturnValue('gmail');

		const element = document.createElement('div');
		const inputListener = jest.fn();
		element.addEventListener('input', inputListener);

		const result = adapter.injectContent(element, '<b>Hello</b>', 'input');

		expect(result).toBe(true);
		expect(element.innerHTML).toBe('<b>Hello</b>');
		expect(inputListener).toHaveBeenCalledTimes(1);
	});

	test('retryInjection resolves once a later retry succeeds', async () => {
		jest.useFakeTimers();
		const adapter = loadAdapter();
		const injectSpy = jest
			.spyOn(adapter, 'injectContent')
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(true);

		const retryPromise = adapter.retryInjection({}, 'content', 'input', 3);
		await jest.advanceTimersByTimeAsync(1000);
		await expect(retryPromise).resolves.toBe(true);
		expect(injectSpy).toHaveBeenCalledTimes(2);
		jest.useRealTimers();
	});
});
