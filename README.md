# Scrum Helper

**Scrum Helper** is a Chrome extension that simplifies writing development reports by auto-filling content based on your Git activity. Just enter your GitHub username, select a date range, and choose your preferences, the extension automatically fetches your commits, pull requests, issues, and code reviews via the GitHub API and generates a pre-filled report that you can edit as needed. While currently focused on Git-based workflows, Scrum Helper is designed to expand to other platforms in the future.

![SCRUMLOGO](docs/images/scrumhelper-png.png)

## Features

- Automatically fetches your Git activity, including commits, pull requests, issues, and code reviews.
- Currently supports GitHub, with plans to expand to other platforms
- Generates editable scrum updates based on your selected date range
- Integrates directly with compose windows in Google Groups, Gmail, Yahoo Mail, and Outlook

## How to install

### For Chrome:

1. Clone this repository to your local machine.
2. Go to `chrome://extensions` on your Chrome browser.
3. Enable Developer Mode (toggle in the top-right) if not already.
4. Click Load unpacked and select the `src` folder inside the cloned repo.
5. Click the Scrum Helper icon on your browser toolbar.
6. Fill in your settings in the popup (GitHub username, date range, etc.)

### For Firefox:

1. Clone this repository to your local machine.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox` (or `about:debugging` > "This Firefox").
3. Click "Load Temporary Add-on...".
4. Navigate to the `src` folder inside the cloned repo and select the `manifest.json` file.
5. The extension will be loaded temporarily and will remain active only for the current browser session.
6. Click the Scrum Helper icon on your browser toolbar.
7. Fill in your settings in the popup (GitHub username, date range, etc.)

**Note for Firefox users:** The extension will be automatically removed when you close Firefox. You'll need to reload it each time you start a new browser session by repeating steps 2-4.

**Persistence Note:**

- If you need the extension to persist between sessions, use [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer/) or [Nightly](https://www.mozilla.org/en-US/firefox/channel/desktop/). You can enable unsigned extension persistence by setting `xpinstall.signatures.required` to `false` in `about:config`.
- For permanent installation and distribution, you must [sign your extension](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/) via Mozilla Add-ons (AMO).

**Compatibility Notes:**

- Scrum Helper uses the `chrome.*` API namespace, which is supported in Firefox for most WebExtension APIs. Firefox provides compatibility for these APIs, but some advanced or Chrome-only APIs may not be available. For most users, all major features will work as expected in Firefox.
- If you encounter issues, consult the [MDN WebExtension compatibility guide](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities).
- For advanced cross-browser compatibility, you may use the [webextension-polyfill](https://github.com/mozilla/webextension-polyfill), but it is not required for standard usage of Scrum Helper.

## Usage

### For Google Groups:

- Open Google Groups New Topic
- Start a New Conversation
- Refresh the page to apply the Scrum Helper settings
- Use the pre-filled scrum and edit as needed

### For Gmail, Yahoo, and Outlook:

- Open the Compose window.
- Ensure the Scrum Helper settings are applied (follow step 6 above)
- The extension will prefill scrum content for you to edit

### New Features

1. **Standalone Popup Interface**

   - Generate reports directly from the extension popup
   - Live preview of the report before sending
   - Rich text formatting with clickable links
   - Copy report to clipboard with proper formatting

2. **Advanced Repository Filtering**

   - Select specific repositories to include in your report for a more focused summary.
   - Easily search and manage your repository list directly within the popup.
   - _Requires a GitHub token to fetch your repositories._

3. **Include Commits on Existing PRs**
   - Option to include recent commits made to pull requests that were opened _before_ the selected date range.
   - Provides a more detailed and accurate view of your work on long-running PRs.
   - _Requires a GitHub token._

### Usage Standalone

- Click on `GENERATE` button to generate the scrum preview.
- Edit it in the window.
- Copy the rich HTML using the `COPY` button.

## Screenshots

![SCRUM](docs/images/scrum.png)

![POPUP](docs/images/popup.png)

![POPUP2](docs/images/popup2.png)

![STANDALONE](docs/images/standalone.png)

![SETTINGSMENU](docs/images/settings.png)

## Setting up the code locally

```
$ git clone https://github.com/fossasia/scrum_helper/
$ cd scrum_helper
$ npm install
```

1. **Install the Extension**

- For Chrome: Load it into your browser through [Chrome Extension Developer Mode](https://developer.chrome.com/docs/extensions/mv3/getstarted/).
<!-- * For Firefox: Load it as a temporary add-on through `about:debugging` as described above. -->

2. **Build the Extension**
   - For Chrome: Rebuild or reload the extension in your browser (`chrome://extensions` → Refresh your extension).
   <!-- * For Firefox: Reload the temporary add-on by going to `about:debugging` → "This Firefox" → Click "Reload" next to your extension. -->
3. **How to Obtain a GitHub Personal Access Token**

- To use Scrum Helper with authenticated requests (for higher rate limits and private repositories), you need a GitHub personal access token.

  #### Steps to Generate a Token

  1. **Go to GitHub Developer Settings:**  
     Visit [https://github.com/settings/tokens](https://github.com/settings/tokens) while logged in to your GitHub account.

  2. **Choose Token Type:**

  - Select **"Personal access tokens (classic)"**.

  3. **Generate a New Token:**

  - Click **"Generate new token"**.
  - Give your token a descriptive name (e.g., "Scrum Helper Extension").
  - Set an expiration date if desired.

  4. **Create and Copy the Token:**

  - Click **"Generate token"** at the bottom.
  - **Copy the token** and save it securely. You will not be able to see it again!

  5. **Paste the Token in Scrum Helper:**

  - Open the Scrum Helper extension popup.
  - Paste your token into the "GitHub Token" field.

  > **Keep your token secret!** Never share it or commit it to public repositories.

  **Why use a token?**  
  GitHub tokens allow the extension to make authenticated requests, increasing your API rate limit and enabling access to private repositories if you grant those permissions.

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
