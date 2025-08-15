# Contributing to Scrum Helper

First off, thank you for considering contributing to Scrum Helper! It's people like you that make this such a great tool. We welcome any and all contributions.

This document provides guidelines for contributing to the project. Please feel free to propose changes to this document in a pull request.

## How Can I Contribute?

- **Reporting Bugs:** If you find a bug, please open an issue on our [GitHub Issues page](https://github.com/fossasia/scrum-helper/issues). Make sure to use the "Bug Report" template and provide as much detail as possible.
- **Suggesting Enhancements:** If you have an idea for a new feature or an improvement to an existing one, you can open an issue using the "Feature or Enhancement Request" template.
- **Pull Requests:** If you're ready to contribute code, we'd be happy to review your pull request.

## Setting Up Your Development Environment

1.  **Fork & Clone the Repository**

    ```sh
    git clone https://github.com/YOUR_USERNAME/scrum-helper.git
    cd scrum-helper
    ```

2.  **Install Dependencies**

    ```sh
    npm install
    ```

3.  **Load the Extension in Your Browser**

    -   Go to `chrome://extensions` in your Chrome browser.
    -   Enable "Developer Mode" (toggle in the top-right).
    -   Click "Load unpacked" and select the `src` folder inside the cloned repository.

4.  **Get a GitHub Personal Access Token (Recommended)**

    To use Scrum Helper with authenticated requests (for higher rate limits and private repositories), you need a GitHub personal access token.

    -   **Go to GitHub Developer Settings:** Visit [https://github.com/settings/tokens](https://github.com/settings/tokens).
    -   **Choose Token Type:** Select "Personal access tokens (classic)".
    -   **Generate a New Token:** Give it a descriptive name (e.g., "Scrum Helper Dev").
    -   **Create and Copy the Token:** Click "Generate token" and copy the token.
    -   **Paste the Token in Scrum Helper:** Open the extension popup, go to settings, and paste your token into the "GitHub Token" field.

## Submitting a Pull Request

1.  **Create a Branch:** Create a new branch for your feature or bug fix.
2.  **Make Your Changes:** Write your code and make sure to follow the project's style.
3.  **Format and Lint Your Code:** Before committing, run the following commands to ensure your code is clean and consistent.

    ```sh
    # Auto-format your code
    npm run format

    # Check for any linting or formatting issues
    npm run check

    # Automatically fix any fixable linting issues
    npm run fix
    ```

4.  **Commit and Push:** Commit your changes with a clear message and push them to your fork.
5.  **Open a Pull Request:** Go to the original repository and open a pull request. Please use the provided pull request template.

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