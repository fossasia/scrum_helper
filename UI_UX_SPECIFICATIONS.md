# Scrum Helper - UI/UX Specifications

## 1. User Flows

### Flow 1: First-Time User Setup

```
┌─────────────────┐
│  Extension      │
│  Installed      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Popup Opens: Welcome Screen             │
│ Title: "Select Your Platform"           │
│ Subtitle: "Which SCM platform do you    │
│ use for development?"                   │
│                                         │
│ [  GitHub  ]  [  GitLab  ]              │
│ [ Gitea  ]  [ Bitbucket ]              │
│                                         │
│ "Don't see your platform? Suggest one" │
└─────────────┬───────────────────────────┘
              │
         ┌────┴────┐
         │          │
    [GitHub]   [GitLab]...
         │          │
         ▼          ▼
    ┌─────────┐  ┌──────────────┐
    │Token    │  │Token + URL   │
    │Input    │  │Input         │
    │Screen   │  │Screen        │
    └────┬────┘  └──────┬───────┘
         │               │
         └───────┬───────┘
                 ▼
         ┌─────────────────┐
         │ Validate Token  │
         │ & Save Settings │
         └────────┬────────┘
                  │
             ┌────┴─────┐
             │           │
          [✓ Valid] [✗ Invalid]
             │           │
             ▼           ▼
         [Main UI]  [Error Screen]
                        │
                        └─► [Retry]
```

### Flow 2: Generate & Send Report

```
┌──────────────────┐
│ Main Popup Page  │
│ Populated with   │
│ defaults         │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ User adjusts:            │
│ - Date range             │
│ - Filters (issues/prs)   │
│ - Options                │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Click [Generate Button]  │
│                          │
│ Button shows:            │
│ "⏳ Generating..."       │
└─────────┬────────────────┘
          │
          ▼
┌──────────────────────────┐
│ Report rendered in       │
│ editable text area       │
│                          │
│ Button state changed to: │
│ "✓ Generated"            │
└─────────┬────────────────┘
          │
     ┌────┴─────┬────────────┐
     │           │            │
    [Copy]   [Send Email] [Share]
     │
     ▼
  ┌─────────────────────────┐
  │ Button shows:           │
  │ "📋 Copied to clipboard"│
  │ (2 sec duration)        │
  └─────────────────────────┘
```

---

## 2. Popup Layout Specifications (375px × 640px)

### Header Section (48px height)

```
┌────────────────────────────────────────┐
│                                        │
│ Scrum Helper     [👤] [⚙️] [🌙]       │
│                                        │
├────────────────────────────────────────┤
```

**Specification:**

- Vertical padding: 12px
- Horizontal padding: 16px
- Display flex, space-between
- Logo + Title on left: 24px line-height, 16px font
- Icons on right: 24×24px each, 8px gap

### Platform Selector (60px height)

```
┌────────────────────────────────────────┐
│ Platform: [GitHub ▼]  [Manage]        │
│                                        │
└────────────────────────────────────────┘
```

**Specification:**

- Padding: 16px
- Label: 12px font, #6b7280 color
- Dropdown: 100% width, 36px height
- Secondary button "Manage Platforms": gray, optional
- Border bottom: light gray 1px

### Settings Panel (conditional height)

```
┌────────────────────────────────────────┐
│ GitHub Token:  [••••••••••••] [👁] [✓]│
│ Organization:  [company      ▼]       │
│                                        │
│ ☐ Use private repositories only       │
│ ☐ Include commits on draft PRs        │
│                                        │
│ [Validate Settings]                    │
│                                        │
└────────────────────────────────────────┘
```

**Specification:**

- Container padding: 16px
- Background: light gray (#f9fafb)
- Form fields: 36px height each
- Checkboxes: 18×18px with margin-right
- Button: full width, 12px margin-top
- Border radius: 8px all inputs

### Main Content Area (scrollable)

```
┌────────────────────────────────────────┐
│ PROJECT SETTINGS                       │
├────────────────────────────────────────┤
│ Project Name:                          │
│ [My Awesome Project]                   │
│                                        │
│ Your Username:                         │
│ [john-doe]                             │
│                                        │
│ DATE RANGE                             │
├────────────────────────────────────────┤
│ From:  [2024-01-15]  To: [2024-01-22] │
│                                        │
│ ☐ Previous Day                        │
│                                        │
│ REPORT OPTIONS                         │
├────────────────────────────────────────┤
│ ☑ Include Pull Requests                │
│ ☑ Include Issues                      │
│ ☑ Include Reviewed PRs                │
│ ☑ Show PR Labels                      │
│                                        │
│ REPORT CONTENT                         │
├────────────────────────────────────────┤
│ [Report will appear here after       │
│  clicking Generate]                   │
│                                        │
│ Lorem ipsum dolor sit amet...         │
│                                        │
│ • Item 1                              │
│ • Item 2                              │
│ • Item 3                              │
│                                        │
└────────────────────────────────────────┘
```

**Specification:**

- Padding: 16px
- Section titles: 12px, uppercase, #6b7280, margin-bottom 8px
- Form fields: 36px height, 8px margin-bottom
- Checkboxes: 18×18px, margin-right 8px
- Report area: min-height 200px, editable textarea, border 2px, padding 12px
- Font: 14px line-height 1.6

### Action Buttons (Footer section, 84px when all buttons visible)

```
┌────────────────────────────────────────┐
│ [🔄 Generate] [📋 Copy]               │
├────────────────────────────────────────┤
│ [✉️ Send Report by Email]             │
│                                        │
└────────────────────────────────────────┘
```

**Specification:**

- Sticky footer (position: fixed at bottom)
- Padding: 16px
- Generate & Copy: grid 2 columns equal width, 8px gap
- Send Email: full width, below grid, margin-top 8px
- Button height: 40px
- Button border-radius: 8px
- Line-height: center vertically
- Icon + text spacing: 8px gap
- States:
  - Default: bg-blue-600, white text
  - Hover: bg-blue-700 with shadow
  - Loading: gray with spinner, disabled
  - Success: checkmark icon, changed text, 2-3 sec then reset

---

## 3. Platform-Specific UI Panels

### GitHub Configuration Panel

```
┌────────────────────────────────────────┐
│ 🐙 GITHUB ACCOUNT                      │
├────────────────────────────────────────┤
│                                        │
│ Token:                                 │
│ [••••••••••••••••••••••] [👁] [✓]     │
│                                        │
│ ℹ️ How to get a personal access token  │
│ (Click to expand)                      │
│                                        │
│ Organization (optional):               │
│ [my-company           ▼]               │
│                                        │
│ ☐ Multiple accounts                   │
│   [+ Add Another Account]              │
│                                        │
│ [Validate & Save]                      │
│                                        │
└────────────────────────────────────────┘
```

### GitLab Configuration Panel

```
┌────────────────────────────────────────┐
│ 🦊 GITLAB ACCOUNT                      │
├────────────────────────────────────────┤
│                                        │
│ Instance Type:                         │
│ ○ GitLab.com                          │
│ ○ Self-hosted                         │
│                                        │
│ [Only show if self-hosted selected]    │
│ Instance URL:                          │
│ [https://gitlab.company.com  ] [✓]   │
│                                        │
│ Token:                                 │
│ [••••••••••••••••••••••] [👁] [✓]    │
│                                        │
│ Group/Namespace (optional):            │
│ [my-group             ▼]               │
│                                        │
│ [Validate & Save]                      │
│                                        │
└────────────────────────────────────────┘
```

### Gitea Configuration Panel

```
┌────────────────────────────────────────┐
│ 🍵 GITEA ACCOUNT                       │
├────────────────────────────────────────┤
│                                        │
│ Instance URL: *required                │
│ [https://gitea.company.com  ] [✓]    │
│                                        │
│ Port (if custom):                      │
│ [3000  ]                               │
│                                        │
│ Token:                                 │
│ [••••••••••••••••••••••] [👁] [✓]    │
│                                        │
│ Username:                              │
│ [john-doe]                             │
│                                        │
│ [Validate & Save]                      │
│                                        │
└────────────────────────────────────────┘
```

### Bitbucket Cloud Configuration Panel

```
┌────────────────────────────────────────┐
│ 🪣 BITBUCKET CLOUD ACCOUNT             │
├────────────────────────────────────────┤
│                                        │
│ Workspace:                             │
│ [my-workspace]                         │
│                                        │
│ Username:                              │
│ [john-doe]                             │
│                                        │
│ Credential Type:                       │
│ ○ App Password                        │
│ ○ OAuth Token                         │
│                                        │
│ App Password:                          │
│ [••••••••••••••••••••••] [👁] [✓]    │
│                                        │
│ [Validate & Save]                      │
│                                        │
└────────────────────────────────────────┘
```

---

## 4. Modal & Overlay Components

### Platform Selection Modal (First Time Only)

```
┌──────────────────────────────────────────┐
│                                          │
│     ⭐ Welcome to Scrum Helper!         │
│                                          │
│  Select your source code platform:      │
│                                          │
│  ┌─────────────────────────────────────┐│
│  │ 🐙 GitHub                           ││
│  │ The most popular Git hosting        ││
│  │ [Get Started >]                     ││
│  └─────────────────────────────────────┘│
│                                          │
│  ┌─────────────────────────────────────┐│
│  │ 🦊 GitLab                           ││
│  │ DevOps platform with free tier      ││
│  │ [Get Started >]                     ││
│  └─────────────────────────────────────┘│
│                                          │
│  ┌─────────────────────────────────────┐│
│  │ 🍵 Gitea                            ││
│  │ Lightweight Git service             ││
│  │ [Get Started >]                     ││
│  └─────────────────────────────────────┘│
│                                          │
│  ┌─────────────────────────────────────┐│
│  │ 🪣 Bitbucket                        ││
│  │ Atlassian Git solution              ││
│  │ [Get Started >]                     ││
│  └─────────────────────────────────────┘│
│                                          │
│  [Skip for now]                         │
│                                          │
└──────────────────────────────────────────┘
```

### Platform Credentials Modal

```
┌──────────────────────────────────────────┐
│ ✕                                        │
│                                          │
│  Connect Your GitHub Account             │
│                                          │
│  Enter your Personal Access Token:       │
│                                          │
│  [••••••••••••••••••••••] [👁]          │
│                                          │
│  [How to create a token?]                │
│                                          │
│  Instructions (collapsible):             │
│  1. Go to GitHub Settings...            │
│  2. Developer Settings...               │
│  3. Copy the token                      │
│                                          │
│     [Cancel]  [Validate & Connect]      │
│                                          │
└──────────────────────────────────────────┘
```

---

## 5. Side-by-Side Layout (Expanded Mode)

For users who expand the popup to side panel mode (responsive at 640px+):

```
┌───────────────────────────────────────────────────────────────┐
│ Scrum Helper                                               SETTINGS
├──────────────────────────────────┬──────────────────────────────┤
│                                  │                              │
│ Platform: [GitHub ▼]             │ GITHUB SETTINGS              │
│                                  │ ─────────────────────────    │
│                                  │ Token: [••••••] [👁] [✓]    │
│ PROJECT SETTINGS                 │                              │
│ ────────────────────             │ Organization:                │
│ Project Name:                    │ [company ▼]                 │
│ [My Project]                     │                              │
│                                  │ ☑ Include commits            │
│ Username:                        │                              │
│ [john-doe]                       │ ☐ Private repos only        │
│                                  │                              │
│ [ Generate ] [ Copy ] [ Send ]   │ [Validate & Save]           │
│                                  │                              │
│ DATES                            │                              │
│ From: [2024-01-15]               │                              │
│ To:   [2024-01-22]               │                              │
│                                  │                              │
│ OPTIONS                          │                              │
│ ☑ Include PRs                   │                              │
│ ☑ Include Issues                │                              │
│ ☑ Include Reviews               │                              │
│                                  │                              │
│ REPORT                           │                              │
│ ├─────────────────────────────── │                              │
│ │ [Fetching data...]             │                              │
│ │                                │                              │
│ │ • PR #123: Add new feature     │                              │
│ │   Status: Merged               │                              │
│ │   Date: 2024-01-15             │                              │
│ │                                │                              │
│ │ • Issue #456: Bug fix           │                              │
│ │   Status: Closed               │                              │
│ │   Date: 2024-01-18             │                              │
│ │                                │                              │
│ └─────────────────────────────── │                              │
│                                  │                              │
└──────────────────────────────────┴──────────────────────────────┘
```

---

## 6. Dark Mode Variants

### Popup in Dark Mode

```
┌────────────────────────────────────┐ Background: #111827
│ 🌙 Scrum Helper      👤 ⚙️ 🌙    │ Text: #f3f4f6
├────────────────────────────────────┤ Borders: #4b5563
│ Platform: [GitHub ▼]               │
│                                    │
│ Project Name:                      │
│ [My Project ↑]  ← Input on dark   │
│  background #1f2937                │
│                                    │
│ [Generated report shows with       │
│  light text on dark background]    │
│                                    │
│ ⓘ Note: light text on dark bg      │
│                                    │
├────────────────────────────────────┤
│ [Generate] [Copy] [Send Email]     │
└────────────────────────────────────┘
```

---

## 7. Error States & Validation

### Token Validation Error

```
┌────────────────────────────────────┐
│ GitHub Token:                      │
│ [••••••••••••••••••••••] [👁] [✗] │ ← ✗ indicates error
│                                    │
│ ❌ Invalid token                  │ ← Error message
│    Please check your token        │
│    and try again.                 │
│                                    │
│ [Troubleshooting guide]            │
│                                    │
└────────────────────────────────────┘
```

### Rate Limit Warning

```
┌────────────────────────────────────┐
│ ⚠️ WARNING                         │
│                                    │
│ You've reached GitHub's API        │
│ rate limit. Please wait for        │
│ your limits to reset or            │
│ add a GitHub token for             │
│ higher limits.                     │
│                                    │
│ Time until reset: 48 minutes       │
│                                    │
│ [Add Token] [OK]                   │
│                                    │
└────────────────────────────────────┘
```

### No Data Found

```
┌────────────────────────────────────┐
│ No Data Found                      │
│                                    │
│ 🔍 We couldn't find any            │
│ contributions for:                 │
│                                    │
│ User: john-doe                    │
│ Date Range: Jan 15 - Jan 22, 2024  │
│                                    │
│ Try:                              │
│ • Expanding the date range        │
│ • Using a different username      │
│ • Checking your token access      │
│                                    │
│ [Adjust Filters]                  │
│                                    │
└────────────────────────────────────┘
```

---

## 8. Loading States

### Generating Report

```
┌────────────────────────────────────┐
│                                    │
│     Generating Report...           │
│                                    │
│     ⟳ Fetching data                │
│       from GitHub                  │
│                                    │
│     ⟳ Processing data...           │
│                                    │
│     ⟳ Formatting report...         │
│                                    │
│     [Cancel]                       │
│                                    │
└────────────────────────────────────┘
```

### Sending Email

```
┌────────────────────────────────────┐
│                                    │
│     Sending Email...               │
│                                    │
│     ⟳ Composing message            │
│                                    │
│     ⟳ Sending...                   │
│                                    │
│     Please wait                    │
│                                    │
└────────────────────────────────────┘
```

---

## 9. Accessibility Specifications

### Keyboard Navigation

1. **Tab Order:**
   - Platform selector
   - Project name input
   - Username input
   - Date range inputs
   - Checkbox inputs
   - Action buttons
   - Settings toggle

2. **Keyboard Shortcuts:**
   ```
   Alt+G = Generate Report
   Alt+C = Copy Report
   Alt+E = Send Email
   Alt+S = Open Settings
   Escape = Close Modals
   ```

### ARIA Labels

```html
<button aria-label="Generate report with current settings" aria-busy="false">
  Generate
</button>

<input
  aria-label="Project name for email subject"
  aria-required="true"
  aria-invalid="false"
/>
```

### Focus Management

- Clear focus indicators (2px solid blue outline, 2px offset)
- Focus trap in modals
- Return focus to trigger element after modal close

---

## 10. Responsive Behavior

### Mobile (360px)

- Single column layout
- Full-width buttons
- Collapsible advanced options
- Hamburger menu for platform selection

### Tablet (640px)

- Two-column layout becomes available
- Settings sidebar appears
- Wider input fields
- Table view for data (if applicable)

### Desktop (1024px+)

- Full side panel view
- Advanced controls visible
- Detailed report preview

---

## 11. Transition & Animation Specifications

### Button State Transitions

- **Default to Hover:** 150ms, ease-out, slight scale up (1.02x)
- **Hover to Active:** 100ms, ease-in, scale down (0.98x)
- **Active to Default:** 200ms, ease-out

### Report Generation

- **Spinner animation:** 1s continuous rotation
- **Success checkmark:** 300ms scale-in + fade-in
- **Success state persistence:** 2-3 seconds

### Modal Entry/Exit

- **Fade in:** 200ms, translateY(-20px → 0)
- **Fade out:** 150ms, opacity 1 → 0

---

## 12. Copy-to-Clipboard Feedback

### Desktop

```
Click [Copy]
    ▼
Button shows: "📋 Copied!"
Text stays for 2 seconds
    ▼
Button returns to original text: "📋 Copy"
```

### Mobile

```
Tap [Copy]
    ▼
Toast notification appears (bottom):
"✓ Report copied to clipboard"
Toast duration: 3 seconds
    ▼
Toast auto-dismisses
```

---

## Wireframe Summary

```
┌─────────────────────────────────────┐
│   MOBILE (360-420px)                │
├─────────────────────────────────────┤
│ Header (fixed top):          48px   │
├─────────────────────────────────────┤
│                                     │
│ Content (scrollable):       500px   │
│                                     │
├─────────────────────────────────────┤
│ Actions (fixed bottom):      84px   │
│                                     │
└─────────────────────────────────────┘
         Total: 640px height


┌──────────────────────────────────────────┐
│   SIDE PANEL (100vw)                     │
├──────────────────┬──────────────────────┤
│ Sidebar Column   │ Main Content Column  │
│ (280px)          │ (flexible)           │
│ - Platform Info  │ - Settings           │
│ - Quick Settings │ - Credentials        │
│ - Status         │ - Advanced Options   │
│                  │                      │
├──────────────────┼──────────────────────┤
│ Fixed footer (both columns)              │
│ Action buttons                           │
└──────────────────┴──────────────────────┘
```

---

_UI/UX Specifications v1.0 - March 2024_
