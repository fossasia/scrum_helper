class EmailClientAdapter {
    constructor() {
        this.clientConfigs = {
            'google-groups': {
                selectors: {
                    body: 'c-wiz [aria-label="Compose a message"][role=textbox][contenteditable="true"]',
                    subject: 'c-wiz input[aria-label=Subject][type="text"]'
                },
                eventTypes: {
                    contentChange: 'paste',
                    subjectChange: 'input'
                }
            },
            'gmail': {
                selectors: {
                    body: 'div.editable.LW-avf[contenteditable="true"][role="textbox"]',
                    subject: 'input[name="subjectbox"][tabindex="1"]'
                },
                eventTypes: {
                    contentChange: 'input',
                    subjectChange: 'input'
                }
            },
            'outlook': {
                selectors: {
                    body: 'div[role="textbox"][contenteditable="true"][aria-multiline="true"]',
                    subject: 'input[aria-label="Add a subject"][type="text"]'
                },
                eventTypes: {
                    contentChange: 'input',
                    subjectChange: 'change'
                },
                injectMethod: 'focusAndPaste'  // Custom injection method
            },
            'yahoo': {
                selectors: {
                    body: '#editor-container [contenteditable="true"][role="textbox"]',
                    subject: 'input[placeholder="Subject"][type="text"]'
                },
                eventTypes: {
                    contentChange: 'input',
                    subjectChange: 'change'
                },
                injectMethod: 'setContent'  // Custom injection method
            }
        };
    }

    detectClient() {
        const hostname = window.location.hostname;
        if (hostname === 'groups.google.com') return 'google-groups';
        if (hostname === 'mail.google.com') return 'gmail';
        if (hostname.endsWith('.outlook.com') || hostname.endsWith('.office.com') || hostname.endsWith('.office365.com') || hostname.endsWith('outlook.live.com') || hostname.includes('.outlook.')) return 'outlook';
        if (hostname === 'mail.yahoo.com') return 'yahoo';
        return null;
    }

    getEditorElements() {
        const clientType = this.detectClient();
        if (!clientType) return null;

        const config = this.clientConfigs[clientType];
        return {
            body: document.querySelector(config.selectors.body),
            subject: document.querySelector(config.selectors.subject),
            eventTypes: config.eventTypes
        };
    }

    // Helper method to injectContent
    dispatchElementEvents(element, events, includeKeyboard = false) {
        if (!element || !events) return;
        
        const eventsToDispatch = Array.isArray(events) ? events : [events];
        
        eventsToDispatch.forEach(eventType => {
            // Dispatch standard events
            element.dispatchEvent(new Event(eventType, { bubbles: true }));
            
            // Dispatch keyboard events if needed
            if (includeKeyboard) {
                element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
                element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            }
        });
    }

    injectContent(element, content, eventType) {
        if (!element) {
            console.log('No element found for injection');
            return false;
        }
        const clientType = this.detectClient();
        const config = this.clientConfigs[clientType];

        try {
            switch(config?.injectMethod) {
                case 'focusAndPaste':
                    // Special handling for Outlook
                    element.focus();
                    element.innerHTML = content;
                   this.dispatchElementEvents(element, ['input', 'change'], true);
                    break;

                case 'setContent':
                    // Special handling for Yahoo
                    element.innerHTML = content;
                    element.focus();
                    // Force Yahoo's editor to recognize the change
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(element);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    this.dispatchElementEvents(element, ['input', 'change']);
                    break;

                default:
                    // Default handling for Google clients
                    element.innerHTML = content;
                    element.dispatchEvent(new Event(eventType, { bubbles: true }));
            }
            return true;
        } catch (error) {
            console.error('Content injection failed:', error);
            return false;
        }
    }

    retryInjection(element, content, eventType, maxRetries = 3) {
        let attempts = 0;
        return new Promise((resolve, reject) => {
            const tryInject = () => {
                if (attempts >= maxRetries) {
                    console.error('Max retry attempts reached');
                    reject(new Error('Max retry attempts reached'));
                    return;
                }
                attempts++;
                if (this.injectContent(element, content, eventType)) {
                    resolve(true);
                } else {
                    setTimeout(tryInject, 1000);
                }
            };
            tryInject();
        });
    }
}

// Create global instance
window.emailClientAdapter = new EmailClientAdapter();