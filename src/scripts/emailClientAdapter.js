class EmailClientAdapter {
    constructor() {
        this.clientConfigs = {
            'google-groups': {
                selectors: {
                    body: 'c-wiz [aria-label="Compose a message"][role=textbox]',
                    subject: 'c-wiz input[aria-label=Subject]'
                },
                eventTypes: {
                    contentChange: 'paste',
                    subjectChange: 'input'
                }
            },
            'gmail': {
                selectors: {
                    body: '.Am.Al.editable',
                    subject: 'input[name="subjectbox"]'
                },
                eventTypes: {
                    contentChange: 'input',
                    subjectChange: 'input'
                }
            },
            'outlook': {
                selectors: {
                    body: 'div[role="textbox"][contenteditable="true"]',
                    subject: 'input[aria-label="Add a subject"]'
                },
                eventTypes: {
                    contentChange: 'input',
                    subjectChange: 'change'
                },
                injectMethod: 'focusAndPaste'  // Custom injection method
            },
            'yahoo': {
                selectors: {
                    body: '#editor-container [contenteditable="true"]',
                    subject: 'input[placeholder="Subject"]'
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
        const url = window.location.href;
        if (url.includes('groups.google.com')) return 'google-groups';
        if (url.includes('mail.google.com')) return 'gmail';
        if (url.includes('outlook')) return 'outlook';
        if (url.includes('mail.yahoo.com')) return 'yahoo';
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

    injectContent(element, content, eventType) {
        if (!element) {
            console.log('No element found for injection');
            return false;
        }
        const clientType = this.detectClient();
        try {
            switch(this.clientConfigs[clientType]?.injectMethod) {
                case 'focusAndPaste':
                    // Special handling for Outlook
                    element.focus();
                    element.innerHTML = content;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    // Simulate keyboard input
                    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
                    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
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
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
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
        
        const tryInject = () => {
            if (attempts >= maxRetries) {
                console.error('Max retry attempts reached');
                return false;
            }
            
            attempts++;
            
            if (this.injectContent(element, content, eventType)) {
                return true;
            }
            
            setTimeout(tryInject, 1000);
        };
        
        return tryInject();
    }
}

// Create global instance
window.emailClientAdapter = new EmailClientAdapter();