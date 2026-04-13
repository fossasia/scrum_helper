### 📌 Fixes

Fixes #279

---

### 📝 Summary of Changes

- Added `flex-wrap: wrap` to `.scrum-actions` so buttons gracefully wrap to the next row when translations are too long to fit in one line
- Removed `white-space: nowrap` from button text spans to allow text wrapping within buttons
- Normalized inconsistent button padding to a uniform `px-4` to fix missing CSS utility class issues

---

### 📸 Screenshots / Demo (if UI-related)

**Before (English):** Buttons appear cramped with inconsistent spacing
**Before (Greek/French):** Buttons overflow and compress, text becomes unreadable

**After (English):** Buttons are evenly spaced and properly aligned
**After (longer translations):** Buttons wrap naturally to a new row, maintaining readability

---

### ✅ Checklist

- [x] I've tested my changes locally
- [ ] I've added tests (if applicable)
- [ ] I've updated documentation (if applicable)
- [x] My code follows the project's code style guidelines

---

### 👀 Reviewer Notes

Only two files changed: `src/index.css` and `src/popup.html`. The `.scrum-actions` class is used in a single place, so there's no risk of unintended side effects. The fix is minimal and uses standard CSS flexbox properties — no new dependencies or complex logic added.
