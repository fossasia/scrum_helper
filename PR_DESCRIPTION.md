### 📌 Fixes

Fixes #219

---

### 📝 Summary of Changes

Added GitLab token support following the same pattern as the existing GitHub token feature:
- Token input field in Settings (only shows when GitLab is selected)
- Stored locally, passed via `PRIVATE-TOKEN` header to GitLab API
- Includes visibility toggle, dark mode support, and i18n strings

This lets users authenticate with private GitLab projects while keeping the same UX as GitHub tokens.

---

### 📸 Screenshots / Demo (if UI-related)

_Token field appears in Settings when GitLab is selected_

---

### ✅ Checklist

- [x] I've tested my changes locally
- [ ] I've added tests (if applicable)
- [ ] I've updated documentation (if applicable)
- [x] My code follows the project's code style guidelines

---

### 👀 Reviewer Notes

- Follows existing GitHub token pattern
- Token is optional - public repos work without it
- Uses `gitlabOnlySection` / `githubOnlySection` classes for platform-specific UI
