// Test script for browser compatibility layer
// Run this in the browser console to test functionality

console.log('Testing browser compatibility layer...');

// Test 1: Check if browserAPI is available
if (typeof browserAPI !== 'undefined') {
    console.log('✅ browserAPI is available');
} else {
    console.error('❌ browserAPI is not available');
}

// Test 2: Test storage API
function testStorage() {
    console.log('Testing storage API...');
    
    browserAPI.storage.local.set({testKey: 'testValue'}, () => {
        console.log('✅ Storage set successful');
        
        browserAPI.storage.local.get(['testKey'], (result) => {
            if (result.testKey === 'testValue') {
                console.log('✅ Storage get successful:', result);
            } else {
                console.error('❌ Storage get failed:', result);
            }
            
            // Clean up
            browserAPI.storage.local.remove(['testKey'], () => {
                console.log('✅ Storage cleanup successful');
            });
        });
    });
}

// Test 3: Test i18n API
function testI18n() {
    console.log('Testing i18n API...');
    
    try {
        const message = browserAPI.i18n.getMessage('appDescription');
        if (message) {
            console.log('✅ i18n API working:', message);
        } else {
            console.log('⚠️ i18n message not found (this might be normal)');
        }
    } catch (error) {
        console.error('❌ i18n API failed:', error);
    }
}

// Test 4: Test runtime API
function testRuntime() {
    console.log('Testing runtime API...');
    
    try {
        // Test if we can add a listener (this won't actually receive messages in this context)
        browserAPI.runtime.onMessage.addListener(() => {});
        console.log('✅ Runtime API working');
    } catch (error) {
        console.error('❌ Runtime API failed:', error);
    }
}

// Test 5: Test sendMessage API (callback style)
function testSendMessage() {
    console.log('Testing sendMessage API (callback style)...');
    
    browserAPI.runtime.sendMessage({action: 'test'}, (response) => {
        if (response) {
            console.log('✅ sendMessage callback successful:', response);
        } else {
            console.log('⚠️ sendMessage callback returned null (this is normal if no handler)');
        }
    });
}

// Test 6: Test sendMessage API (Promise style)
async function testSendMessagePromise() {
    console.log('Testing sendMessage API (Promise style)...');
    
    try {
        const response = await browserAPI.sendMessagePromise({action: 'test'});
        console.log('✅ sendMessage Promise successful:', response);
    } catch (error) {
        console.log('⚠️ sendMessage Promise error (this is normal if no handler):', error);
    }
}

// Test 7: Detect browser
function detectBrowser() {
    if (typeof browser !== 'undefined' && browser.runtime) {
        console.log('🌐 Running in Firefox');
    } else if (typeof chrome !== 'undefined' && chrome.runtime) {
        console.log('🌐 Running in Chrome');
    } else {
        console.log('🌐 Browser detection failed');
    }
}

// Run all tests
function runAllTests() {
    console.log('=== Browser Compatibility Tests ===');
    detectBrowser();
    testStorage();
    testI18n();
    testRuntime();
    testSendMessage();
    testSendMessagePromise();
    console.log('=== Tests Complete ===');
}

// Auto-run tests if this script is loaded
if (typeof window !== 'undefined') {
    // Wait a bit for everything to load
    setTimeout(runAllTests, 1000);
}

// Export for manual testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runAllTests, testStorage, testI18n, testRuntime, detectBrowser };
} 