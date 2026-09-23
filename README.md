# Scrum Helper

**Scrum Helper** is a Chrome extension that simplifies writing development reports by auto-filling content based on your Git activity. Select your platform, enter your username and authentication details, choose a date range, and select your preferences. The extension automatically fetches your commits, pull requests, issues, and code reviews via the selected platform's API and generates a pre-filled report that you can edit as needed. Scrum Helper currently supports GitHub, GitLab, and Codeberg, allowing developers to generate scrum reports from their activity across multiple Git platforms.

![SCRUMLOGO](docs/images/scrumhelper-png.png)

## Features

- Automatically fetches your Git activity, including commits, pull requests, issues, and code reviews.
- Supports GitHub, GitLab, and Codeberg.
- Supports platform-specific authentication and configuration.
- Supports custom Codeberg API base URLs.
- Generates editable scrum updates based on your selected date range
- Integrates directly with compose windows in Google Groups, Gmail, Yahoo Mail, and Outlook

## How to install

### For Chrome:

1. Open the Chrome Web Store and search for [“Scrum Helper”](https://chromewebstore.google.com/detail/Scrum%20Helper/begjldpiiihpnaflcbdbbophiifphokg) by FOSSASIA.
2. Click “Add to Chrome”.
3. Pin the extension to your toolbar (optional).
4. Open the extension popup from your browser toolbar.
5. Select your preferred platform from the platform dropdown and enter the required account and authentication details.
6. Select your date range and preferences.
7. Start composing your reports in Gmail, Yahoo Mail, Outlook, or Google Groups using the extension.
## Setting Up Your Development Environment

1.  **Fork & Clone the Repository**

    ```sh
    git clone https://github.com/YOUR_USERNAME/scrum_helper.git
    cd scrum_helper
    ```

2.  **Install Dependencies**

    ```sh
    npm install
    ```

3.  **Build the Extension**

    Because Chromium (Chrome, Edge, etc.) and Gecko (Firefox) browsers handle Manifest V3 differently, we use a build step to generate engine-specific distributions.

    ```sh
    npm run build
    ```

4.  **Load the Extension in Your Browser**

    **For Chrome, Edge & Brave (Chromium):**
    -   Go to `chrome://extensions` (or `edge://extensions` / `brave://extensions`) in your browser.
    -   Enable "Developer Mode" (toggle in the top-right).
    -   Click "Load unpacked" and select the `dist/chrome` folder inside the cloned repository.

    **For Firefox (Gecko):**
    -   Navigate to `about:debugging` in Firefox.
    -   Click on "This Firefox" in the left sidebar.
    -   Click "Load Temporary Add-on...".
    -   Select the `manifest.json` file inside the `dist/firefox` folder.
    -   *Note: The extension will remain active only for the current browser session. If you need persistence, consider using Firefox Developer Edition.*

    **For Opera:**
    -   Go to `opera://extensions` in Opera.
    -   Enable "Developer mode" (toggle in the top-right).
    -   Click "Load unpacked" and select the `dist/opera` folder inside the cloned repository.

5.  **Set Up & Run the Tauri Desktop App (Standalone Application)**

    If you are developing the desktop version of Scrum Helper:
    -   **Step 5.1: Install System Dependencies**
        Tauri requires system libraries to build the webview and Rust backend:

        *On Ubuntu/Debian:*

        ```sh
        sudo apt update
        sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
        ```

        *On Windows or macOS:*
        Refer to the official [Tauri Prerequisites Guide](https://v2.tauri.app/start/prerequisites/) to install C++ build tools and platform-specific WebKit SDKs.

    -   **Step 5.2: Install Rust**
        Tauri requires Rust. Run the following toolchain installer:

        ```sh
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
        ```

        *(Note: Restart your shell after installation for cargo to load into your PATH environment).*

    -   **Step 5.3: Run in Development Mode**
        To run a hot-reloading development window of the desktop application:

        ```sh
        npm run tauri dev
        ```

    -   **Step 5.4: Build Standalone Production Binaries**
        To compile the final standalone installers (e.g. `.deb`, `.AppImage`, `.msi`, `.dmg`):
        ```sh
        npm run tauri build
        ```
        The compiled installers and binaries will be written to:
        `src-tauri/target/release/bundle/`

## Usage

### Selecting a Platform
1. Open the Scrum Helper extension.
2. **Select your platform from the platform dropdown: GitHub, GitLab, or Codeberg.**
3. Enter the username and authentication details required for the selected platform.
4. **For GitLab, provide the required Group filter.**
5. **For Codeberg, optionally configure a custom API base URL.**
6. Select your desired date range and preferences.
7. Generate your scrum report.
8. Review and edit the generated report before using it in your preferred email or group platform.

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

2.  **Advanced Repository Filtering**
    *   Select specific repositories to include in your report for a more focused summary.
    *   Easily search and manage your repository list directly within the popup.
    *   *Requires a GitHub personal access token (classic) to fetch your repositories.*

3.  **Include Commits on Existing PRs**
    *   Option to include recent commits made to pull requests that were opened *before* the selected date range.
    *   Provides a more detailed and accurate view of your work on long-running PRs.
    *   *Requires a GitHub personal access token (classic).*

4.  **Flexible Display Modes**
    *   Easily toggle the extension display mode between a traditional **Popup** and a persistent **Side Panel** in the settings.
    *   *Note: The older standard extension on/off toggle has been removed in favor of this UI flexibility.*

5.  **Smart Caching & Auto-Generation**
    *   **Auto-Load:** When you open the extension, it instantly restores your previously generated Scrum report if there is a healthy cache in memory.
    *   **Auto-Generate:** If there is no cached report available, the extension automatically calculates and generates a new report without requiring you to click anything.
    *   **Manual Refresh:** If the cache duration expires (defaults to 10 minutes), the auto-load stops, and you just need to click the "Generate" button yourself to fetch fresh data.

### Usage Standalone

- Click on `GENERATE` button to generate the scrum preview (if not auto-generated).
- Edit it in the window.
- Copy the rich HTML using the `COPY` button.

## Contributing

We welcome contributions from the community! Whether it's reporting a bug, suggesting a new feature, or writing code, your help is appreciated.

Please read our **[Contributing Guide](CONTRIBUTING.md)** to learn how you can get involved.

## License

This project is licensed under the LGPL-2.1 License - see the [LICENSE](LICENSE) file for details.

## Screenshots

| | |
|---|---|
| ![POPUP](docs/images/popup.png) | ![POPUP2](docs/images/popup2.png) |
| ![STANDALONE](docs/images/standalone.png) | ![SETTINGSMENU](docs/images/settings.png) |

| |
|---|
| ![SCRUM](docs/images/scrum.png) |

## Setting up the code locally

```
$ git clone https://github.com/fossasia/scrum_helper/
$ cd scrum_helper
$ npm install
```

1. **Install the Extension / Run Desktop App**

* For Chrome, Edge & Brave (Chromium): Load it into your browser through [Chrome Extension Developer Mode](https://developer.chrome.com/docs/extensions/mv3/getstarted/) using the `dist/chrome` folder.
* For Firefox: Load it as a temporary add-on through `about:debugging` using the `dist/firefox` folder.
* For Opera: Load it through Developer mode at `opera://extensions` using the `dist/opera` folder.
* For Standalone Desktop App (Tauri):
  * Install dependencies (Rust toolchain, build essential, webkit2gtk libraries - see Dev environment setup above).
  * Run the application in developer mode:
    ```sh
    npm run tauri dev
    ```

2. **Rebuild / Re-run**
   After making changes to the source code:
   * For Browser Extensions: Rebuild the distributions running `npm run build`, and then refresh/reload the extension in your browser's Developer panel.
   * For Standalone Desktop App (Tauri): The development server (`npm run tauri dev`) will hot-reload your code changes automatically in real-time. If you want to bundle a release installer, run:
     ```sh
     npm run tauri build
     ```
   
## Platform Setup and Authentication

Scrum Helper supports **GitHub, GitLab, and Codeberg**. Select your platform from the platform dropdown and provide the required authentication and configuration details.

### GitHub

To use Scrum Helper with GitHub:

* Enter your **GitHub username**.
* Enter a **GitHub Personal Access Token (classic)**.
* The token can be used for authenticated API requests, higher API rate limits, and access to private repositories when the appropriate permissions are granted.

#### Creating a GitHub Personal Access Token (Classic)

1. Go to [GitHub Developer Settings](https://github.com/settings/tokens) while logged in to your GitHub account.
2. Select **Personal access tokens (classic)**.
3. Click **Generate new token** and select **Generate new token (classic)**.
4. Give the token a descriptive name and configure its expiration and required permissions.
5. Click **Generate token**.
6. Copy the token and store it securely. GitHub will not show the token again.
7. Enter the token in the GitHub token field in Scrum Helper.

> **Keep your token secret.** Never share it or commit it to a public repository.

### GitLab

To use Scrum Helper with GitLab:

* Enter your **GitLab username**.
* Enter a **GitLab Personal Access Token**.
* The token must have the **`read_api` scope**.
* Enter the **Group filter** to specify the GitLab group whose repositories should be included.

#### Creating a GitLab Personal Access Token

1. Open your GitLab account settings.
2. Navigate to **Access Tokens**.
3. Create a new Personal Access Token.
4. Give the token a descriptive name and set an expiration date if required.
5. Select the **`read_api`** scope.
6. Create the token and copy it securely.
7. Enter the token in Scrum Helper and configure the required Group filter.

> **Keep your token secret.** Never share it or commit it to a public repository.

### Codeberg

To use Scrum Helper with Codeberg:

* Enter your **Codeberg username**.
* Enter your **Codeberg Access Token**.
* Optionally provide a **custom Codeberg API base URL**.
* The default API base URL is:
  `https://codeberg.org/api/v1`

The custom API base URL allows Scrum Helper to work with custom or self-hosted Codeberg instances that provide a compatible API.

#### Creating a Codeberg Access Token

1. Log in to your Codeberg account.
2. Navigate to your account settings and open the **Applications** or access-token section.
3. Create a new access token.
4. Give the token a descriptive name and configure the required permissions.
5. Create the token and copy it securely.
6. Enter your username and access token in Scrum Helper.
7. If you are using the standard Codeberg service, leave the API base URL as:
   `https://codeberg.org/api/v1`
8. If you are using a custom Codeberg instance, enter its API base URL in the API Base URL field.

> **Keep your token secret.** Never share it or commit it to a public repository.


## Release Process

This project uses a fully automated release process powered by GitHub Actions. Understanding this process is helpful for both maintainers and contributors.

The process is split into two parts:

### 1. Automated Release Drafting

This part runs every time a pull request is merged into the `master` branch.

1.  **PR Merge**: A contributor's pull request is reviewed and merged.
2.  **Drafting Workflow**: The "Release Drafter" workflow is triggered.
3.  **Versioning**: The workflow inspects the `release:*` label or PR title to determine the next semantic version.
4.  **Changelog Update**: The `CHANGELOG.md` file is automatically updated with the titles of the merged PRs.
5.  **Draft Creation**: A new draft release is created or updated in the [Releases](https://github.com/fossasia/scrum_helper/releases) section. This draft includes the new version tag and the updated changelog notes.

### 2. Manual Release Publishing

This part is performed manually by maintainers when it's time to publish a new version.

1.  **Verification**: A maintainer reviews the draft release to ensure it's accurate and complete.
2.  **Publishing**: The maintainer publishes the release from the GitHub UI.
3.  **Chrome Web Store Deployment**: Publishing the release triggers the "Publish to Chrome Web Store" workflow, which automatically packages the extension and uploads it for review.

### If you encounter any bugs, please report them at the [Issues page](https://github.com/fossasia/scrum_helper/issues).

## AI-Assisted Contributions Guidelines

This project is receiving an increasing number of AI-assisted contributions. While we welcome the productivity AI tools bring, we require all contributions to maintain our standards for quality, intentionality, and maintainability. To ensure a high signal-to-noise ratio in our repository, please adhere to the following guidelines.

### Expectations from Contributors

* **You must understand your code:** We expect human judgment to be the final filter. You take full responsibility for every line you submit.
* **You must be able to explain:** If asked by a maintainer, you should be able to explicitly explain what your change does, why it is necessary, and how it integrates with the rest of the codebase.
* **Code must be:** 
  * Thoroughly tested
  * Manually validated in a real browser environment
  * Aligned with our existing architecture and codebase patterns

### What We Do NOT Accept

* PRs submitted without a clear use case or a linked, pre-approved issue.
* AI-generated code pasted blindly without deep comprehension.
* Duplicate PRs or attempts at solving issues that are already being handled.
* Surface-level "fixes" (e.g., unprompted refactoring, nitpicks) without solid reasoning.
* Features or abstractions that increase overall complexity without delivering tangible user value.

### PR Requirements

* **Linked Issue:** Every PR (unless it is a trivial typo fix) must be linked to an existing issue.
* **Clear Description:** Provide a well-reasoned description detailing the problem and your solution. Do not paste AI-generated summaries of file diffs.
* **Existing Patterns:** Follow the established project conventions implicitly. 
* **Avoid Complexity:** Keep changes as minimal and focused as possible.

### AI Best Practices Table

| Area | Good Contribution | Poor Contribution |
| :--- | :--- | :--- |
| **Problem selection** | Solving a verified, pre-existing issue that you understand and ideally have encountered. | Submitting unrequested "improvements" or claiming random issues without a real-world use case. |
| **Understanding** | Using AI to learn the codebase or brainstorm approaches, then writing/refining the final logic yourself. | Over-delegating to AI; submitting logic that you cannot confidently explain or debug. |
| **Code quality** | Focused, minimal changes that address the exact problem efficiently. | Bloated PRs that introduce unnecessary code churn or rewrite entire blocks out of context. |
| **Architecture** | Conforming strictly to the established design patterns and utilities of the project. | Hallucinating new dependencies or forcing foreign paradigms into the codebase. |
| **Validation** | Manually compiling and verifying the extension works, and writing reliable tests. | Submitting code that has never been tested locally or fails basic linting. |
| **Maintainability** | The implemented solution is simpler for us to maintain than the problem it solves. | Adding excessive "clever" complexity that increases the maintainer's review burden. |
| **PR description** | Writing a clear, human-authored explanation of the *why* behind your changes. Including screenshots of your changes.| Pasting a generic, AI-generated summary of the modified files without context. |
| **AI usage** | Disclosing your use of generative tools and verifying that the output makes sense. | Failing to review AI output, resulting in regressions or confidently incorrect logic. |

### Maintainer Policy

* We reserve the right to close low-quality or fully automated PRs that fail to meet these guidelines without extensive review.
* PRs containing features not aligned with our current priorities or roadmap may be closed.
* Contributors are strongly encouraged to pick well-defined, triaged issues to ensure their time and effort result in a successful merge.


