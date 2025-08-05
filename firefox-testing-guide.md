# Firefox Compatibility Testing Guide

## Overview
This guide explains how to test the Scrum Helper extension on Mozilla Firefox and ensure cross-browser compatibility.

## Changes Made for Firefox Compatibility

### 1. Manifest Updates
- Added `browser_specific_settings` with Firefox-specific configuration
- Set minimum Firefox version to 109.0
- Added unique extension ID for Firefox

### 2. Browser Compatibility Layer
- Created `browser-compat.js` to handle API differences
- Unified Chrome and Firefox APIs through a common interface
- Added proper error handling for Firefox's async storage API

### 3. Code Updates
- Replaced all `chrome.*` API calls with `browserAPI.*` calls
- Updated storage, runtime, and i18n API usage
- Maintained backward compatibility with Chrome

## How to Test on Firefox

### Step 1: Load the Extension in Firefox

1. **Open Firefox** and navigate to `about:debugging`
2. **Click "This Firefox"** in the left sidebar
3. **Click "Load Temporary Add-on..."**
4. **Select the `manifest.json` file** from your extension directory
5. The extension should appear in the list with a temporary ID

### Step 2: Test Basic Functionality

1. **Click the extension icon** in the toolbar
2. **Verify the popup opens** and displays correctly
3. **Test the dark mode toggle** - should work without issues
4. **Check all UI elements** are properly styled and functional

### Step 3: Test Core Features

1. **Enter GitHub username** and token
2. **Select a date range** (last week, yesterday, or custom)
3. **Click "Generate Report"** - should fetch data and display results
4. **Test copy functionality** - should copy report to clipboard
5. **Test settings panel** - all options should work

### Step 4: Test Storage and Persistence

1. **Configure settings** (username, token, dates, etc.)
2. **Close and reopen the popup** - settings should persist
3. **Test organization filtering** - should work with GitHub tokens
4. **Test repository filtering** - should load and filter repositories

### Step 5: Test Email Integration

1. **Navigate to Gmail** or Outlook
2. **Start composing a new email**
3. **Click the extension icon** - should inject scrum report
4. **Verify subject line** is auto-filled
5. **Check report formatting** in the email body

### Step 6: Test Error Handling

1. **Enter invalid GitHub token** - should show appropriate error
2. **Enter non-existent username** - should handle gracefully
3. **Test with network issues** - should show error messages
4. **Test with missing permissions** - should request appropriately

## Common Firefox-Specific Issues

### 1. Storage API Differences
- **Issue**: Firefox uses async storage API vs Chrome's sync
- **Solution**: Browser compatibility layer handles this automatically
- **Test**: Verify settings persist across browser sessions

### 2. Content Security Policy
- **Issue**: Firefox has stricter CSP requirements
- **Solution**: Manifest includes proper CSP settings
- **Test**: Verify extension loads without CSP errors

### 3. Extension ID Requirements
- **Issue**: Firefox requires unique extension IDs
- **Solution**: Added `browser_specific_settings.gecko.id`
- **Test**: Extension should load with unique Firefox ID

### 4. API Permission Differences
- **Issue**: Some APIs may require different permissions
- **Solution**: Manifest includes all necessary permissions
- **Test**: All features should work without permission errors

## Debugging Firefox Issues

### 1. Check Browser Console
- Open Firefox Developer Tools (F12)
- Check Console tab for JavaScript errors
- Look for storage or API-related errors

### 2. Check Extension Debugging
- Go to `about:debugging` > "This Firefox"
- Click "Inspect" next to your extension
- Check for background script errors

### 3. Test Storage API
```javascript
// In browser console, test storage:
browserAPI.storage.local.set({test: 'value'}, () => {
    browserAPI.storage.local.get(['test'], (result) => {
        console.log('Storage test:', result);
    });
});
```

### 4. Check Network Requests
- Open Network tab in Developer Tools
- Generate a report and check API calls
- Verify GitHub API requests are working

## Performance Testing

### 1. Load Time
- Measure time to open popup
- Check for any delays in UI rendering

### 2. API Response Time
- Test with different data sizes
- Verify caching works properly

### 3. Memory Usage
- Monitor memory usage during report generation
- Check for memory leaks

## Cross-Browser Testing Checklist

- [ ] Extension loads in Firefox
- [ ] Popup UI displays correctly
- [ ] All buttons and inputs work
- [ ] Settings persist across sessions
- [ ] GitHub API integration works
- [ ] Report generation functions
- [ ] Copy to clipboard works
- [ ] Email integration works
- [ ] Error handling is appropriate
- [ ] Performance is acceptable

## Troubleshooting

### Extension Won't Load
1. Check manifest.json syntax
2. Verify all required files exist
3. Check browser console for errors
4. Ensure Firefox version is 109.0+

### Storage Not Working
1. Check browser compatibility layer
2. Verify async/await handling
3. Test storage API directly
4. Check for permission issues

### API Calls Failing
1. Verify host permissions in manifest
2. Check CORS settings
3. Test API endpoints directly
4. Verify token permissions

### UI Issues
1. Check CSS compatibility
2. Verify JavaScript errors
3. Test with different screen sizes
4. Check for Firefox-specific CSS issues

## Deployment Notes

### For Firefox Add-ons Store
1. Package extension as .xpi file
2. Submit for review process
3. Include Firefox-specific documentation
4. Test on multiple Firefox versions

### For Self-Distribution
1. Create .xpi package
2. Host on your website
3. Provide installation instructions
4. Include Firefox-specific setup guide 