# SCRUM Helper

This chrome extension helps you to write scrum reports in Google Groups and other email clients for FOSSASIA related projects. You need to add your github username, dates, and other options. It fetches your PRs, Issues, and the PRs you reviewed from Github API, and prefills the SCRUM. You can edit the scrum further to meet your needs.

![SCRUMLOGO](docs/images/scrumhelper-png.png)

## How to install
```
1. Clone this repository.
2. Goto `chrome://extensions` on your chrome browser.
3. Turn on developer mode if not already on.
4. Load unpacked extension from `src` folder.
5. Click on the Scrum Helper icon you see on your browser toolbar.
6. Fill in the settings in the popup.
7. Open https://groups.google.com/forum/#!newtopic/<groupname>.
8. Refresh the page for new settings to reflect.
```
### New Features
1. **Standalone Popup Interface**
   - Generate reports directly from the extension popup
   - Live preview of the report before sending
   - Rich text formatting with clickable links
   - Copy report to clipboard with proper formatting

2. **Enhanced Formatting**
   - HTML support in the preview window
   - Markdown formatting when copying to clipboard
   - Links are preserved in format: `[title](url)`
   - Proper line breaks and list formatting

3. **Email Client Integration**
   - Seamless integration with various email clients
   - Ensures consistent formatting across email clients, previews, and copied content.
   - Automatic subject line generation
   - Support for HTML content in compatible clients

## Setting up the code locally

```
$ git clone https://github.com/fossasia/scrum_helper/
$ cd scrum_helper
$ npm install
```
## Screenshots
![SCRUM](/docs/images/scrum.png)

![POPUP](/docs/images/popup.png)

## About contributing
- Follow the Issues and PRs templates as far as possible.
- If you want to make a PR, please mention in the corresponding issue that you are working on it.
- Please run `npm run test` locally to check for syntax errors before making a PR.
