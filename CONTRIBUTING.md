# Contributing to Scrum Helper

First off, thank you for considering contributing to Scrum Helper! It's people like you that make this such a great tool. We welcome any and all contributions.

This document provides guidelines for contributing to the project. Please feel free to propose changes to this document in a pull request.

## How Can I Contribute?

- **Reporting Bugs:** If you find a bug, please open an issue on our [GitHub Issues page](https://github.com/fossasia/scrum_helper/issues). Make sure to use the "Bug Report" template and provide as much detail as possible.
- **Suggesting Enhancements:** If you have an idea for a new feature or an improvement to an existing one, you can open an issue using the "Feature or Enhancement Request" template.
- **Pull Requests:** If you're ready to contribute code, we'd be happy to review your pull request.

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

    Because Chromium and Gecko browsers parse Manifest V3 slightly differently, the extension needs to be built to generate specific assets for each browser context.
    
    ```sh
    npm run build
    ```

    *This process ensures appropriate manifest configurations are deployed to `dist/chrome` and `dist/firefox`.*

4.  **Load the Extension in Your Browser**

    **For Chrome & Edge (Chromium):**
    -   Go to `chrome://extensions` (or `edge://extensions`) in your browser.
    -   Enable "Developer Mode" (toggle in the top-right).
    -   Click "Load unpacked" and select the `dist/chrome` folder inside the cloned repository.

    **For Firefox (Gecko):**
    -   Go to `about:debugging` in Firefox.
    -   Click "This Firefox" in the left sidebar.
    -   Click "Load Temporary Add-on..." and select the `manifest.json` inside the `dist/firefox` folder.

    **For Opera (Chromium):**
    -   Go to `opera://extensions` in your browser.
    -   Enable "Developer Mode" (toggle in the top-right).
    -   Click "Load unpacked" and select the `dist/opera` folder inside the cloned repository.

5.  **Get a Personal Access Token (Recommended)**

    To use Scrum Helper with authenticated requests (for higher rate limits and private repositories), you can configure a personal access token for your git provider:

    -   **GitHub (Fine-grained):**
        -   **Go to Developer Settings:** Visit [https://github.com/settings/tokens](https://github.com/settings/tokens).
        -   **Choose Token Type:** Select "Fine-grained personal access tokens".
        -   **Generate a New Token:** Restrict the token to the required private repositories and grant `Issues: Read`, `Pull requests: Read`, and `Contents: Read` permissions. GitHub includes `Metadata: Read` automatically.
        -   **Create and Copy the Token:** Click "Generate token" and copy the token.
        -   **Paste the Token in Scrum Helper:** Open the extension popup, go to settings, and paste your token into the "GitHub Token" field.

    -   **GitLab:**
        -   **Go to Access Tokens:** Visit [https://gitlab.com/-/profile/personal_access_tokens](https://gitlab.com/-/profile/personal_access_tokens).
        -   **Generate a New Token:** Click "Add new token", provide a token name (e.g., "Scrum Helper Dev"), and select the `read_api` scope.
        -   **Create and Copy the Token:** Click "Create personal access token" and copy the token.
        -   **Paste the Token in Scrum Helper:** Open the extension popup, go to settings, switch to GitLab, and paste your token into the "GitLab Token" field.

    -   **Codeberg (Forgejo / Gitea):**
        -   **Go to Applications Settings:** Visit [https://codeberg.org/user/settings/applications](https://codeberg.org/user/settings/applications) (or your self-hosted instance settings).
        -   **Generate a New Token:** Under "Manage Access Tokens", give it a name (e.g., "Scrum Helper Dev") and select required read permissions (`read:repository`, `read:user`, `read:issue`).
        -   **Create and Copy the Token:** Click "Generate Token" and copy the token.
        -   **Paste the Token in Scrum Helper:** Open the extension popup, go to settings, switch to Codeberg, and paste your token into the "Codeberg Token" field (and verify the "Codeberg API Base URL", defaulting to `https://codeberg.org/api/v1`).

6.  **Develop the Tauri Desktop App (Optional)**

    Scrum Helper also ships as a desktop application powered by [Tauri](https://tauri.app/). To run the desktop app in development mode, rebuild and restart it after making changes:

    ```sh
    npm run tauri dev
    ```

    > **Note:** Tauri requires the Rust toolchain. Follow the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) if this is your first time setting it up.

## Running Tests

Scrum Helper uses [Vitest](https://vitest.dev/) for unit testing. Always run the test suite before submitting a pull request.

**Run the full test suite once:**

```sh
npm test
```

**Run tests in watch mode** (reruns on file save — great for active development):

```sh
npm run test:watch
```

---

## Submitting a Pull Request

1.  **Create a Branch:** Create a new branch for your feature or bug fix.
2.  **Make Your Changes:** Write your code and make sure to follow the project's style.
3.  **Format and Lint Your Code (Biome):** Scrum Helper uses [Biome](https://biomejs.dev/) for linting and formatting. Before committing, run the following commands to ensure your code is clean and consistent.

    ```sh
    # Check for formatting and linting issues (no changes written)
    npm run check

    # Auto-format your code
    npm run format

    # Run the Biome linter only
    npm run lint

    # Automatically fix any safe, fixable linting issues
    npm run fix
    ```

    > **Tip:** Run `npm run check` first to see all issues, then `npm run format` and `npm run fix` to resolve them automatically.

4.  **Copilot-Assisted Self-Review:** Before requesting a review from maintainers, contributors are encouraged (but not required) to perform a quick self-review using GitHub Copilot, if available. This can help catch simple issues early, improve code quality, and speed up the review process.

    This repository has automatic Copilot PR reviews enabled. These are triggered only if the contributor has GitHub Copilot enabled with an active license. If you already have access (e.g., via educational programs or developer benefits), enabling it can help reduce manual review effort.

    Contributions without Copilot are absolutely welcome and will be reviewed as usual.

5.  **Commit and Push:** Commit your changes with a clear message and push them to your fork.
6.  **Open a Pull Request:** Go to the original repository and open a pull request. Please use the provided pull request template.

### Pre-PR Checklist

Before opening a pull request, please confirm you have completed the following:

- [ ] **Tests pass:** `npm test` runs without failures.
- [ ] **No lint/format errors:** `npm run check` reports no issues.
- [ ] **Code is formatted:** `npm run format` has been applied.
- [ ] **Branch is up to date:** Your branch is rebased or merged with the latest `main`.
- [ ] **PR title is descriptive:** The title clearly summarizes the change (used in release notes).
- [ ] **Release classification provided:** Apply one of `release:major`, `release:minor`, `release:patch`, or `release:none`, or include a supported release keyword in the PR title.

---

### Writing Meaningful Pull Requests

The release notes are automatically generated from merged pull requests. To ensure the release notes are clear and helpful, please:

1.  **Write a descriptive title.** The PR title is the primary entry in the release notes. It should concisely summarize the change.
2.  **Provide a clear description.** The body of your PR should explain the "what" and "why" of your changes.

### Pull Request Labeling & Semantic Versioning

The project uses an automated release process that relies on pull request labels and titles to determine the semantic version. Please use one of the methods below.

**Method 1: Using Labels (Preferred)**

Apply **one** of the following labels to your pull request:

-   `release:major`: For breaking changes.
-   `release:minor`: For new features or significant enhancements.
-   `release:patch`: For backward-compatible bug fixes or maintenance.
-   `release:none`: To exclude the change from the release notes.

**Method 2: Using PR Titles (Fallback)**

If no label is applied, the system will inspect your PR title for keywords like `major`, `feat`, `fix`, etc.

If you are unsure, a maintainer will apply the correct label before merging.

## Adding a New Language

You can add a new language to Scrum Helper for your own use or contribute it to the project.

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

For more details, see the [Chrome i18n documentation](https://developer.chrome.com/docs/extensions/reference/i18n/)

## Avoiding Duplicate Issues and Pull Requests

- **Issues:** We encourage you to open new issues, but before doing so please search existing open and closed issues and pull requests to avoid duplication. If an existing issue already describes the problem, add any new details or a comment (or a +1 reaction) and, if you plan to work on it, mention that in the thread.
- **Pull Requests:** Before opening a pull request, check open PRs for the same change. If a PR already exists addressing the same issue, comment on or collaborate in that PR instead of creating a duplicate. If you accidentally open a duplicate PR, please close it and reference the original PR with a brief note.