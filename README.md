# SCRUM Helper

This chrome extension helps you to write scrums in google groups for FOSSASIA related projects. You need to add your github username, dates, and other options. It fetches your PRs, Issues, and the PRs you reviewed from Github API, and prefills the SCRUM. You can edit the scrum further to meet your needs.

![SCRUMLOGO](docs/images/scrumhelper-png.png)

## How to install

1. Clone this repository to your local machine.
2. Go to `chrome://extensions` on your chrome browser.
3. Turn on developer mode if not already on.
4. Load unpacked extension from `src` folder.
5. Click on the Scrum Helper icon you see on your browser toolbar.
6. Fill in the settings in the popup.
7. **For Google Groups:**  
   - Open https://groups.google.com/forum/#!newtopic/<groupname> and start a New Conversation.  
8. Refresh the page to apply the new settings.  
9. **For Gmail, Yahoo, and Outlook:**  
   - Open the Compose window.  
   - Follow Step 8 to ensure the settings take effect.  

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
