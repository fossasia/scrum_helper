# SCRUM Helper

**SCRUM Helper** is a Chrome extension designed to simplify writing scrums in Google Groups for FOSSASIA projects. By adding your GitHub username, date range, and other options, it automatically fetches your PRs, Issues, and reviewed PRs via the GitHub API and pre-fills the scrum. You can then edit the scrum to fit your needs.


![SCRUMLOGO](docs/images/scrumhelper-png.png)

## Features

- Fetches your GitHub PRs, Issues, and reviewed PRs  
- Auto-generates scrum updates  
- Supports Google Groups, Gmail, Yahoo, and Outlook compose windows  

## How to install

1. Clone this repository to your local machine.
2. Go to `chrome://extensions` on your chrome browser.
3. Enable Developer Mode (toggle in the top-right) if not already.
4. Click Load unpacked and select the `src` folder inside the cloned repo
5. Click the Scrum Helper icon on your browser toolbar
6. Fill in your settings in the popup (GitHub username, date range, etc.)

## Usage
### For Google Groups:  
- Open Google Groups New Topic
- Start a New Conversation
- Refresh the page to apply the Scrum Helper settings
- Use the pre-filled scrum and edit as needed

### For Gmail, Yahoo, and Outlook:
- Open the Compose window.  
- Ensure the Scrum Helper settings are applied (follow step 6 above)
-  The extension will prefill scrum content for you to edit

### New Features
1. **Standalone Popup Interface**
   - Generate reports directly from the extension popup
   - Live preview of the report before sending
   - Rich text formatting with clickable links
   - Copy report to clipboard with proper formatting

### Usage Standalone
- Click on `GENERATE` button to generate the scrum preview.
- Edit it in the window.
- Copy the rich HTML using the `COPY` button.

## Setting up the code locally

```
$ git clone https://github.com/fossasia/scrum_helper/
$ cd scrum_helper
$ npm install
```
## Screenshots
![SCRUM](/docs/images/scrum.png)

![POPUP](/docs/images/popup.png)

![STANDALONE](docs/images/standalone.png)

## About contributing
- Follow the Issues and PRs templates as far as possible.
- If you want to make a PR, please mention in the corresponding issue that you are working on it.
- Before making a PR, ensure your code is properly formatted and linted:
  - Format your code: This command automatically formats your code based on the project's style guidelines.
    ```sh
    npm run format
    ```
  - Check for issues: This command runs the formatter, linter, and import sorting on the requested files to enforce coding standards.
    ```sh
    npm run check
    ```
  - Fix linting errors: If the linter detects fixable issues, this command will automatically apply the necessary corrections.
    ```sh
    npm run fix
    ```
- If you encounter any bugs, please report them at the [Issues page](https://github.com/fossasia/scrum_helper/issues).
