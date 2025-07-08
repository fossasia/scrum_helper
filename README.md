# SCRUM Helper

**SCRUM Helper** is a Chrome extension designed to simplify writing scrums in Google Groups for FOSSASIA projects. By adding your GitHub username, date range, and other options, it automatically fetches your PRs, Issues, and reviewed PRs via the GitHub API and pre-fills the scrum. You can then edit the scrum to fit your needs.

![SCRUMLOGO](docs/images/scrumhelper-png.png)

## Features

- Automatically fetches your Git activity, including:
  - **GitHub**: issues, pull requests, and code reviews
  - **GitLab**: issues, merge requests, and reviewed merge requests
- Supports both **GitHub** and **GitLab** platforms
- Simple platform selection UI (checkboxes for GitHub and GitLab)
- Generates editable scrum updates based on your selected date range
- Integrates directly with compose windows in Google Groups, Gmail, Yahoo Mail, and Outlook
- Standalone popup interface for previewing and copying scrum reports

## How to install

### For Chrome:

1. Clone this repository to your local machine.
2. Go to `chrome://extensions` on your chrome browser.
3. Enable Developer Mode (toggle in the top-right) if not already.
4. Click Load unpacked and select the `src` folder inside the cloned repo
5. Click the Scrum Helper icon on your browser toolbar
6. Fill in your settings in the popup (GitHub or GitLab username, date range, etc.)

<!-- ### For Firefox:

1. Clone this repository to your local machine.
2. Open Firefox and navigate to `about:debugging`
3. Click on "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on..."
5. Navigate to the `src` folder inside the cloned repo and select the `manifest.json` file
6. The extension will be loaded temporarily and will remain active only for the current browser session
7. Click the Scrum Helper icon on your browser toolbar
8. Fill in your settings in the popup (GitHub or GitLab username, date range, etc.)

**Note for Firefox users:** The extension will be automatically removed when you close Firefox. You'll need to reload it each time you start a new browser session by repeating steps 2-5.

**Persistence Note:** If you need the extension to persist between sessions, use Firefox Developer Edition. You can enable persistence by setting `xpinstall.signatures.required` to `false` in the browser's configuration. -->

## Usage

### Platform Selection
- In the popup, you can select either **GitHub** or **GitLab** using the checkboxes. Only one can be selected at a time.
- Enter your username for the selected platform.
- The extension will fetch and generate your scrum report from the chosen platform.

### For Google Groups:
- Open Google Groups New Topic
- Start a New Conversation
- Refresh the page to apply the Scrum Helper settings
- Use the pre-filled scrum and edit as needed

### For Gmail, Yahoo, and Outlook:
- Open the Compose window.
- Ensure the Scrum Helper settings are applied (see install steps above)
- The extension will prefill scrum content for you to edit

### Standalone Popup Usage
- Click on `GENERATE` button to generate the scrum preview.
- Edit it in the window.
- Copy the rich HTML using the `COPY` button.

## What Data is Fetched?
- **GitHub:** Issues, pull requests, and code reviews (for the selected date range and organization)
- **GitLab:** Issues, merge requests, and reviewed merge requests (for the selected date range)

## Screenshots

![SCRUM](docs/images/scrum.png)

![POPUP](docs/images/popup.png)

![POPUP2](docs/images/popup2.png)

![STANDALONE](docs/images/standalone.png)

![SETTINGSMENU](docs/images/settings.png)

## Using Scrum Helper with Your Own GitHub Organization

Scrum Helper is not limited to the [FOSSASIA](https://github.com/fossasia) organization. You can easily configure it to fetch and generate SCRUM reports for your own GitHub organization or repositories.

### Steps to Set It Up for Your Organization

1. **Install the Extension**

* For Chrome: Load it into your browser through [Chrome Extension Developer Mode](https://developer.chrome.com/docs/extensions/mv3/getstarted/).
* For Firefox: Load it as a temporary add-on through `about:debugging` as described above.

2. **Update the Organization**
   * Currently, the extension uses `org:fossasia` to fetch GitHub issues and PRs.
   * To make it work with your GitHub organization:
     * Open `scrumHelper.js` (or wherever the GitHub API URLs are defined).
     * Replace:

       ```js
       +org:fossasia+
       ```

       with:

       ```js
       +org:your-org-name+
       ```

       **Example**
       ![Code Snippet ](<Screenshot 2025-05-30 205822.png>)

3. **Build the Extension**
   * Save your changes.
   * For Chrome: Rebuild or reload the extension in your browser (`chrome://extensions` → Refresh your extension).
   * For Firefox: Reload the temporary add-on by going to `about:debugging` → "This Firefox" → Click "Reload" next to your extension.
4. **How to Obtain a GitHub Personal Access Token**

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

  ---
5. **Get Customized SCRUM Reports**
    - The reports will now be generated using contributions from your organization.

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
