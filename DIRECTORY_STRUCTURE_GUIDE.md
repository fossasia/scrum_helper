# Scrum Helper - Directory & File Organization Guide

## Current vs. Proposed Structure

### Current Structure (GitHub-Only)

```
scrum_helper/
├── src/
│   ├── scripts/
│   │   ├── background.js
│   │   ├── emailClientAdapter.js
│   │   ├── gitlabHelper.js          ← Attempt at multi-platform
│   │   ├── jquery-3.2.1.min.js
│   │   ├── main.js
│   │   ├── popup.js                  ← Tightly coupled to GitHub
│   │   └── scrumHelper.js             ← Core logic (mostly GitHub)
│   ├── popup.html
│   ├── manifest.json
│   ├── index.css
│   ├── scrumStyle.css
│   ├── tailwindcss.css
│   ├── _locales/
│   └── icons/
│
├── README.md
├── package.json
└── ...
```

### Proposed Structure (Multi-Platform)

```
scrum_helper/
├── src/
│   ├── scripts/
│   │
│   ├── core/                         ← NEW: Core infrastructure
│   │   ├── platformManager.js
│   │   ├── platformInterface.js
│   │   ├── storageManager.js
│   │   ├── tokenManager.js
│   │   ├── configManager.js
│   │   ├── dataProcessor.js
│   │   └── errorHandler.js
│   │
│   ├── adapters/                     ← NEW: Platform-specific adapters
│   │   ├── platformInterface.js      ← Abstract base class (copy)
│   │   ├── githubAdapter.js
│   │   ├── gitlabAdapter.js
│   │   ├── giteaAdapter.js
│   │   ├── bitbucketAdapter.js
│   │   └── adapterUtils.js           ← Shared adapter utilities
│   │
│   ├── ui/                           ← NEW: UI component logic
│   │   ├── components/
│   │   │   ├── platformSelector.js
│   │   │   ├── tokenInput.js
│   │   │   ├── settingsPanel.js
│   │   │   ├── reportGenerator.js
│   │   │   └── platformConfigPanel.js
│   │   └── uiManager.js
│   │
│   ├── formatters/                   ← NEW: Report & email formatting
│   │   ├── reportFormatter.js
│   │   ├── emailFormatter.js
│   │   └── templates/
│   │       ├── default.html
│   │       ├── detailed.html
│   │       └── summary.txt
│   │
│   ├── styles/                       ← REFACTORED: Better organization
│   │   ├── design-tokens.css         ← Color, spacing, typography
│   │   ├── components.css            ← Component styles
│   │   ├── platform-themes.css       ← Platform-specific colors
│   │   ├── popup.css                 ← Popup-specific styles
│   │   ├── dark-mode.css             ← Dark mode overrides
│   │   ├── responsive.css            ← Media queries
│   │   ├── animations.css            ← Keyframe animations
│   │   └── accessibility.css         ← A11y utilities
│   │
│   ├── legacy/                       ← DEPRECATED: Old code (for reference)
│   │   ├── scrumHelper.js.old        ← Original scrumHelper (archived)
│   │   └── README.md                 ← Migration notes
│   │
│   ├── scripts/
│   │   ├── popup.js                  ← REFACTORED: Thin wrapper
│   │   ├── background.js             ← Updated for multi-platform
│   │   ├── main.js                   ← Existing (unchanged)
│   │   ├── emailClientAdapter.js     ← Existing (unchanged)
│   │   └── jquery-3.2.1.min.js       ← Vendor (unchanged)
│   │
│   ├── popup.html                    ← REDESIGNED: Multi-platform UI
│   ├── manifest.json                 ← UPDATED: New scripts listed
│   ├── index.css                     ← DEPRECATED: Use design-tokens.css
│   ├── scrumStyle.css                ← DEPRECATED: Use components.css
│   │
│   ├── _locales/
│   │   ├── en/messages.json          ← UPDATED: New translations
│   │   ├── de/messages.json
│   │   ├── es/messages.json
│   │   ├── fr/messages.json
│   │   ├── ja/messages.json
│   │   └── ... (all other languages)
│   │
│   ├── icons/                        ← Existing (add platform icons if needed)
│   ├── fontawesome/                  ← Existing (unchanged)
│   ├── materialize/                  ← Existing (unchanged)
│   └── resources/                    ← NEW: Platform resources
│       ├── github-icon.svg
│       ├── gitlab-icon.svg
│       ├── gitea-icon.svg
│       ├── bitbucket-icon.svg
│       └── README.md
│
├── tests/                            ← NEW: Test suite
│   ├── adapters/
│   │   ├── github.test.js
│   │   ├── gitlab.test.js
│   │   ├── gitea.test.js
│   │   └── bitbucket.test.js
│   │
│   ├── core/
│   │   ├── platformManager.test.js
│   │   ├── storageManager.test.js
│   │   ├── tokenManager.test.js
│   │   └── dataProcessor.test.js
│   │
│   ├── ui/
│   │   ├── components.test.js
│   │   └── integration.test.js
│   │
│   ├── formatters/
│   │   └── reportFormatter.test.js
│   │
│   ├── integration/
│   │   ├── platform-switching.test.js
│   │   ├── report-generation.test.js
│   │   └── storage-migration.test.js
│   │
│   └── setup.js                      ← Test configuration
│
├── docs/                             ← CREATED: Comprehensive documentation
│   ├── MULTI_PLATFORM_ARCHITECTURE.md
│   ├── DESIGN_SYSTEM.md
│   ├── UI_UX_SPECIFICATIONS.md
│   ├── IMPLEMENTATION_GUIDE.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   │
│   ├── PLATFORM_SETUP.md             ← NEW: Setup guides per platform
│   │   ├── GitHub-Setup.md
│   │   ├── GitLab-Setup.md
│   │   ├── Gitea-Setup.md
│   │   └── Bitbucket-Setup.md
│   │
│   ├── API_REFERENCE.md              ← NEW: Platform adapter API docs
│   ├── USER_GUIDE.md                 ← NEW: For end users
│   ├── MIGRATION_GUIDE.md            ← NEW: For existing users
│   └── CONTRIBUTING.md               ← UPDATED: Dev guidelines
│
├── .github/
│   └── workflows/
│       ├── test.yml                  ← NEW: Run tests on PR
│       ├── lint.yml                  ← Existing (updated)
│       └── publish-to-chrome.yml     ← UPDATED: Publish only after tests
│
├── CHANGELOG.md                      ← UPDATED: Track multi-platform changes
├── MULTI_PLATFORM_ARCHITECTURE.md    ← Reference to docs/
├── DESIGN_SYSTEM.md                  ← Reference to docs/
├── UI_UX_SPECIFICATIONS.md           ← Reference to docs/
├── IMPLEMENTATION_GUIDE.md           ← Reference to docs/
├── IMPLEMENTATION_SUMMARY.md         ← Reference to docs/
├── README.md                         ← UPDATED: Add multi-platform info
├── package.json                      ← UPDATED: Add test scripts
└── ...
```

---

## File Descriptions

### Core Infrastructure (`src/scripts/core/`)

| File                   | Purpose                                   | ~Lines |
| ---------------------- | ----------------------------------------- | ------ |
| `platformInterface.js` | Abstract base class for all adapters      | 250    |
| `platformManager.js`   | Manages platform registration & switching | 200    |
| `storageManager.js`    | Unified storage abstraction               | 300    |
| `tokenManager.js`      | Secure token encryption/decryption        | 150    |
| `configManager.js`     | Configuration validation & defaults       | 150    |
| `dataProcessor.js`     | Data normalization & transformation       | 200    |
| `errorHandler.js`      | Centralized error handling                | 100    |

### Adapters (`src/scripts/adapters/`)

| File                   | Purpose               | ~Lines | Status    |
| ---------------------- | --------------------- | ------ | --------- |
| `platformInterface.js` | Copy of abstract base | 250    | Reference |
| `githubAdapter.js`     | GitHub API adapter    | 400    | Refactor  |
| `gitlabAdapter.js`     | GitLab API adapter    | 450    | Enhance   |
| `giteaAdapter.js`      | Gitea API adapter     | 350    | New       |
| `bitbucketAdapter.js`  | Bitbucket API adapter | 400    | New       |
| `adapterUtils.js`      | Shared utilities      | 150    | New       |

### UI Components (`src/scripts/ui/`)

| File                     | Purpose                            |
| ------------------------ | ---------------------------------- |
| `platformSelector.js`    | Platform selection dropdown/modal  |
| `tokenInput.js`          | Token input with visibility toggle |
| `settingsPanel.js`       | Settings form manager              |
| `reportGenerator.js`     | Report generation UI               |
| `platformConfigPanel.js` | Platform-specific config UI        |
| `uiManager.js`           | Overall UI coordination            |

### Styles (Refactored)

| File                  | Purpose                               |
| --------------------- | ------------------------------------- |
| `design-tokens.css`   | Color, spacing, typography variables  |
| `components.css`      | All component styles                  |
| `platform-themes.css` | Platform-specific accent colors       |
| `popup.css`           | Popup-mode specific styles            |
| `dark-mode.css`       | Dark mode overrides                   |
| `responsive.css`      | All media queries                     |
| `animations.css`      | Keyframe animations                   |
| `accessibility.css`   | A11y utilities (sr-only, focus, etc.) |

### Tests (`tests/`)

```
tests/
├── adapters/           ← Unit tests for each adapter
├── core/              ← Unit tests for core modules
├── ui/                ← UI component tests
├── formatters/        ← Formatter tests
├── integration/       ← Cross-module integration tests
└── setup.js           ← Jest/Mocha configuration
```

### Documentation (`docs/`)

```
docs/
├── PLATFORM_SETUP.md      ← How to set up each platform
├── API_REFERENCE.md       ← Adapter interface documentation
├── USER_GUIDE.md          ← User-facing documentation
├── MIGRATION_GUIDE.md     ← For users upgrading from v2.0
└── CONTRIBUTING.md        ← Developer guidelines
```

---

## Import Path Examples

### After Refactoring

```javascript
// In popup.js
import { platformManager } from "./core/platformManager.js";
import { storageManager } from "./core/storageManager.js";
import { PlatformSelector } from "./ui/components/platformSelector.js";

// In adapters
import { PlatformAdapter } from "./adapters/platformInterface.js";

// In formatters
import { ReportFormatter } from "./formatters/reportFormatter.js";

// Using adapters
const { GitHubAdapter } = require("./adapters/githubAdapter.js");
platformManager.register("github", GitHubAdapter);
```

---

## Migration Checklist

### File Organization

- [ ] Create `src/scripts/core/` directory
- [ ] Create `src/scripts/adapters/` directory
- [ ] Create `src/scripts/ui/` directory
- [ ] Create `src/scripts/formatters/` directory
- [ ] Create `src/styles/` directory
- [ ] Create `tests/` directory
- [ ] Create `docs/` directory
- [ ] Archive old files (don't delete yet)

### Core Infrastructure

- [ ] Create `platformInterface.js`
- [ ] Create `platformManager.js`
- [ ] Create `storageManager.js`
- [ ] Create `tokenManager.js` (or use SubtleCrypto)
- [ ] Create `configManager.js`
- [ ] Create `dataProcessor.js`
- [ ] Create `errorHandler.js`

### Adapters

- [ ] Create `GitHub Adapter` (refactor from scrumHelper.js)
- [ ] Create `GitLab Adapter` (enhance from gitlabHelper.js)
- [ ] Create `Gitea Adapter` (new)
- [ ] Create `Bitbucket Adapter` (new)
- [ ] Create `adapterUtils.js` (shared code)

### UI & Styles

- [ ] Reorganize CSS files (by layer)
- [ ] Create design token CSS
- [ ] Create component CSS
- [ ] Create platform-specific theme CSS
- [ ] Update popup.html (multi-platform)
- [ ] Create UI component modules

### Testing

- [ ] Setup Jest/Mocha configuration
- [ ] Create adapter tests
- [ ] Create core module tests
- [ ] Create integration tests
- [ ] Add pre-commit hooks

### Documentation

- [ ] Create comprehensive docs
- [ ] Add inline code comments
- [ ] Create API reference
- [ ] Create user guide
- [ ] Create migration guide

---

## Key Points About Organization

### 1. **Separation of Concerns**

- Core logic in `core/`
- Platform-specific code in `adapters/`
- UI logic in `ui/components/`
- Styles in `styles/` (by layer)
- Tests mirror source structure

### 2. **Easy to Navigate**

- New developers can find code quickly
- File names describe purpose clearly
- Related files grouped together
- Clear import paths

### 3. **Scalability**

- New platform = 1 new file
- New component = 1 new file
- No monolithic files
- Clear extension points

### 4. **Backward Compatibility**

- Can run old `scrumHelper.js` alongside new code
- Gradual migration possible
- No big-bang refactor needed
- Easy rollback

### 5. **Testing**

- Tests co-located with source
- Test files mirror source structure
- Easy to find what to test
- Running specific test suite easy

---

## Build & Bundling Considerations

### Current Build

```bash
# Manifest.json lists individual files
content_scripts: [
  "scripts/jquery-3.2.1.min.js",
  "scripts/emailClientAdapter.js",
  "scripts/gitlabHelper.js",
  "scripts/scrumHelper.js"
]
```

### Future Build (Optional Optimization)

```javascript
// Could use webpack/rollup if needed, but keep it simple for now
// Chrome supports native ES6 modules
content_scripts: [
  "scripts/jquery-3.2.1.min.js",
  "scripts/bundled/content.bundle.js", // All JS bundled
];

// Or keep individual files for development clarity
// Only bundle for production release
```

### Recommendation

Stay with individual files for now:

- Easier debugging
- Chrome supports ES6
- Keep manifest readable
- Migrate to bundler only if needed

---

## LSP & IDE Support

### For Better IDE Support

```javascript
// Use JSDoc for type hints
/**
 * @param {PlatformAdapter} adapter
 * @returns {Promise<void>}
 */
async function setupAdapter(adapter) {}

// Or add TypeScript for real type safety
// But requires build step (optional enhancement)
```

---

## Package.json Script Examples

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint --fix src/",
    "format": "prettier --write src/",
    "build": "webpack",
    "dev": "webpack --watch"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

---

## Summary

This organization provides:
✅ Clear structure for multi-platform support
✅ Easy to add new platforms
✅ Better maintainability
✅ Scalable architecture
✅ Comprehensive testing framework
✅ Clear separation of concerns

_Follow this structure from the beginning of the refactor to avoid painful reorganization later._

---

_Directory & File Organization Guide v1.0 - March 2024_
