# Scrum Helper

**Scrum Helper** is a Chrome extension that simplifies writing development reports by auto-filling content based on your Git activity. Just enter your GitHub or GitLab username, select a date range, and choose your preferences, the extension automatically fetches your commits, pull requests/merge requests, issues, and code reviews via the GitHub and GitLab APIs and generates a pre-filled report that you can edit as needed. Scrum Helper supports both GitHub and GitLab platforms, making it versatile for different development workflows.

![SCRUMLOGO](docs/images/scrumhelper-png.png)

## Features

- **Multi-Platform Support**: Automatically fetches your Git activity from both GitHub and GitLab
- **Comprehensive Activity Tracking**: Includes commits, pull requests/merge requests, issues, and code reviews
- **Flexible Date Ranges**: Generate reports for custom date ranges or use quick presets (last 7 days, last 1 day)
- **Platform-Specific Features**:
  - **GitHub**: Full support with personal access tokens for enhanced features
  - **GitLab**: Support for public repositories and user contributions
- **Smart Caching**: Configurable cache TTL to optimize API calls and improve performance


## Supported Platforms

### GitHub
- Full API support with personal access tokens
- Repository filtering capabilities
- Enhanced rate limits with authentication
- Commit tracking on existing pull requests

### GitLab
- Support for public repositories
- User contribution tracking across projects
- Merge request and issue tracking
- Project-based activity aggregation


## How to install

### For Chrome:

1. Clone this repository to your local machine.
2. Go to `chrome://extensions` on your chrome browser.
3. Enable Developer Mode (toggle in the top-right) if not already.
4. Click Load unpacked and select the `src` folder inside the cloned repo
5. Click the Scrum Helper icon on your browser toolbar
6. Fill in your settings in the popup (platform selection, username, date range, etc.)

<!-- ### For Firefox:

1. Clone this repository to your local machine.
2. Open Firefox and navigate to `about:debugging`
3. Click on "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on..."
5. Navigate to the `src` folder inside the cloned repo and select the `manifest.json` file
6. The extension will be loaded temporarily and will remain active only for the current browser session
7. Click the Scrum Helper icon on your browser toolbar
8. Fill in your settings in the popup (platform selection, username, date range, etc.)

**Note for Firefox users:** The extension will be automatically removed when you close Firefox. You'll need to reload it each time you start a new browser session by repeating steps 2-5.

**Persistence Note:** If you need the extension to persist between sessions, use Firefox Developer Edition. You can enable persistence by setting `xpinstall.signatures.required` to `false` in the browser's configuration. -->

## Usage

### Platform Selection
- Choose between GitHub and GitLab from the platform dropdown
- Each platform maintains separate username settings
- Platform-specific features are automatically enabled/disabled based on selection

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

2. **Advanced Repository Filtering** (GitHub only)
    *   Select specific repositories to include in your report for a more focused summary.
    *   Easily search and manage your repository list directly within the popup.
    *   *Requires a GitHub token to fetch your repositories.*

3. **Include Commits on Existing PRs** (GitHub only)
    *   Option to include recent commits made to pull requests that were opened *before* the selected date range.
    *   Provides a more detailed and accurate view of your work on long-running PRs.
    *   *Requires a GitHub token.*

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


* For Chrome: Load it into your browser through [Chrome Extension Developer Mode](https://developer.chrome.com/docs/extensions/mv3/getstarted/).
<!-- * For Firefox: Load it as a temporary add-on through `about:debugging` as described above. -->



2. **Build the Extension**
   * For Chrome: Rebuild or reload the extension in your browser (`chrome://extensions` → Refresh your extension).
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
  - Go to Settings and paste your token into the "GitHub Token" field.

  > **Keep your token secret!** Never share it or commit it to public repositories.

  **Why use a token?**  
  GitHub tokens allow the extension to make authenticated requests, increasing your API rate limit and enabling access to private repositories if you grant those permissions.

 

## Adding a New Language

You can add a new language to Scrum Helper for your own use, or contribute it to the project.

### Using a New Language Locally

1. **Create a Locale Folder**
   - Go to `src/_locales`.
   - Create a new folder named with the [ISO language code](https://developer.chrome.com/docs/extensions/reference/i18n/#localeTable) (e.g., `it` for Italian, `fr` for French).

2. **Add a `messages.json` File**
   - Copy the `messages.json` from `src/_locales/en/messages.json` or any other language as a template.
   - Translate only the `"message"` values into your language.  
     **Do not translate the extension name ("Scrum Helper") or the footer ("Made with ❤️ by ...").**

3. **Test the Extension**
   - Reload the extension in your browser.
   - Change your browser or system language to your new locale (see your browser’s language settings).
   - The extension will use your translation automatically if your language is set.

> **You do not need to make a pull request to use your language locally.**

### Contributing Your Translation

If you want to share your translation with others:
- Make a pull request with your new locale folder and `messages.json` file.
- We recommend double-checking your translations for accuracy and clarity.

For more details, see the [Chrome i18n documentation](https://developer.chrome.com/docs/extensions/reference/i18n/).


## Release Process

This project uses a fully automated release process powered by GitHub Actions. Understanding this process is helpful for both maintainers and contributors.

The process is split into two parts:

### 1. Automated Release Drafting

This part runs every time a pull request is merged into the `master` branch.

1.  **PR Merge**: A contributor's pull request is reviewed and merged.
2.  **Drafting Workflow**: The "Release Drafter" workflow is triggered.
3.  **Versioning**: The workflow inspects the `release:*` label or PR title to determine the next semantic version.
4.  **Changelog Update**: The `CHANGELOG.md` file is automatically updated with the titles of the merged PRs.
5.  **Draft Creation**: A new draft release is created or updated in the [Releases](https://github.com/fossasia/scrum-helper/releases) section. This draft includes the new version tag and the updated changelog notes.

### 2. Manual Release Publishing

This part is performed manually by maintainers when it's time to publish a new version.

1.  **Verification**: A maintainer reviews the draft release to ensure it's accurate and complete.
2.  **Publishing**: The maintainer publishes the release from the GitHub UI.
3.  **Chrome Web Store Deployment**: Publishing the release triggers the "Publish to Chrome Web Store" workflow, which automatically packages the extension and uploads it for review.

## About contributing

- Follow the Issues and PRs templates as far as possible.
- If you want to make a PR, please mention in the corresponding issue that you are working on it.

### Writing Meaningful Pull Requests

The release notes are automatically generated from the pull requests merged into `master`. To ensure the release notes are clear and helpful, please:

1.  **Write a descriptive title.** The PR title is the primary entry in the release notes. It should concisely summarize the change.
2.  **Provide a clear description.** The body of your PR should explain the "what" and "why" of your changes. This context is invaluable for reviewers and for anyone looking back at the project's history.

### Pull Request Labeling & Semantic Versioning
This project uses an automated release process that relies on pull request labels and titles to determine the semantic version for a new release. For your contribution to be included in the release notes, please use one of the methods below.

**Method 1: Using Labels (Preferred)**

The clearest way to signal the impact of your change is to apply **one** of the following labels to your pull request. This is the recommended approach.

-   `release:major`: For breaking changes that are not backward-compatible.
-   `release:minor`: For new features or significant enhancements.
-   `release:patch`: For backward-compatible bug fixes, documentation updates, or maintenance.
-   `release:none`: To exclude the change from the release notes entirely.

**Method 2: Using PR Titles**

As a fallback, if no `release:*` label is applied, the system will inspect your pull request title for the following keywords (case-insensitive) to determine the version bump:

-   `major`: For breaking changes.
-   `minor`: For new features.
-   `patch`, `fix`, `chore`, `documentation` : For bug fixes and other small changes.

If you are unsure which label to use, please write a clear and descriptive title, and a maintainer will apply the correct label before merging.

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
