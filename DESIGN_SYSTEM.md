# Scrum Helper - Design System Guide

## 1. Color System

### Semantic Colors

#### Primary (Action Colors)

```css
--color-primary-50: #eff6ff;
--color-primary-100: #dbeafe;
--color-primary-200: #bfdbfe;
--color-primary-300: #93c5fd;
--color-primary-400: #60a5fa;
--color-primary-500: #3b82f6; /* Primary */
--color-primary-600: #2563eb; /* Primary Hover */
--color-primary-700: #1d4ed8; /* Primary Active */
--color-primary-800: #1e40af;
--color-primary-900: #1e3a8a;
```

#### Success (Positive Actions)

```css
--color-success-50: #f0fdf4;
--color-success-100: #dcfce7;
--color-success-200: #bbf7d0;
--color-success-300: #86efac;
--color-success-400: #4ade80;
--color-success-500: #22c55e; /* Success */
--color-success-600: #16a34a; /* Success Hover */
--color-success-700: #15803d; /* Success Active */
```

#### Warning (Caution)

```css
--color-warning-50: #fffbeb;
--color-warning-100: #fef3c7;
--color-warning-200: #fde68a;
--color-warning-300: #fcd34d;
--color-warning-400: #fbbf24;
--color-warning-500: #f59e0b;
--color-warning-600: #d97706;
--color-warning-700: #b45309;
```

#### Error (Danger/Destruction)

```css
--color-error-50: #fef2f2;
--color-error-100: #fee2e2;
--color-error-200: #fecaca;
--color-error-300: #fca5a5;
--color-error-400: #f87171;
--color-error-500: #ef4444;
--color-error-600: #dc2626;
--color-error-700: #b91c1c;
```

#### Neutral (Disabled, Secondary)

```css
--color-neutral-50: #fafafa;
--color-neutral-100: #f5f5f5;
--color-neutral-200: #e5e5e5;
--color-neutral-300: #d4d4d4;
--color-neutral-400: #a3a3a3;
--color-neutral-500: #737373;
--color-neutral-600: #525252;
--color-neutral-700: #404040;
--color-neutral-800: #262626;
--color-neutral-900: #171717;
```

### Light Mode Color Tokens

```css
:root {
  /* Background */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --bg-overlay: rgba(0, 0, 0, 0.5);

  /* Text */
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --text-inverse: #ffffff;

  /* Border */
  --border-light: #e5e7eb;
  --border-medium: #d1d5db;
  --border-strong: #9ca3af;

  /* Surface */
  --surface-primary: #ffffff;
  --surface-secondary: #f9fafb;
  --surface-raised: #ffffff;
  --surface-sunken: #f3f4f6;
}
```

### Dark Mode Color Tokens

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Background */
    --bg-primary: #111827;
    --bg-secondary: #1f2937;
    --bg-tertiary: #374151;
    --bg-overlay: rgba(0, 0, 0, 0.8);

    /* Text */
    --text-primary: #f3f4f6;
    --text-secondary: #d1d5db;
    --text-tertiary: #9ca3af;
    --text-inverse: #1f2937;

    /* Border */
    --border-light: #4b5563;
    --border-medium: #374151;
    --border-strong: #6b7280;

    /* Surface */
    --surface-primary: #1f2937;
    --surface-secondary: #111827;
    --surface-raised: #374151;
    --surface-sunken: #0f172a;
  }
}
```

---

## 2. Typography

### Font Stack

```css
body {
  --font-family-base:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue",
    Arial, sans-serif;
  --font-family-mono: "Roboto Mono", "Courier New", monospace;

  font-family: var(--font-family-base);
}

code,
pre,
.token-input {
  font-family: var(--font-family-mono);
}
```

### Scale

```css
/* Headings */
h1 {
  font-size: 32px;
  line-height: 40px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

h2 {
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  letter-spacing: -0.25px;
}

h3 {
  font-size: 20px;
  line-height: 28px;
  font-weight: 600;
}

h4 {
  font-size: 18px;
  line-height: 24px;
  font-weight: 600;
}

/* Body */
.text-lg {
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
}

.text-base {
  font-size: 14px;
  line-height: 20px;
  font-weight: 400;
}

.text-sm {
  font-size: 12px;
  line-height: 16px;
  font-weight: 400;
}

.text-xs {
  font-size: 11px;
  line-height: 14px;
  font-weight: 400;
}

/* Labels */
label {
  font-size: 12px;
  line-height: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

/* Mono */
.mono {
  font-family: var(--font-family-mono);
  font-size: 11px;
  line-height: 16px;
  color: var(--text-tertiary);
}
```

---

## 3. Spacing System

### Base Unit: 8px

```css
:root {
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 40px;
  --spacing-3xl: 48px;
  --spacing-4xl: 56px;

  /* Padding */
  --padding-button: 12px 16px; /* sm: 8px 12px, lg: 16px 24px */
  --padding-input: 10px 12px;
  --padding-card: 24px;
  --padding-section: 32px;
}
```

---

## 4. Component Library

### Buttons

#### Primary Button

```css
.button-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);

  padding: var(--padding-button);
  border: none;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;

  background-color: var(--color-primary-600);
  color: #ffffff;
  cursor: pointer;
  transition: all 200ms ease;

  &:hover {
    background-color: var(--color-primary-700);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
  }

  &:active {
    background-color: var(--color-primary-800);
    transform: scale(0.98);
  }

  &:disabled {
    background-color: var(--color-neutral-300);
    color: var(--text-tertiary);
    cursor: not-allowed;
  }

  &.loading {
    pointer-events: none;
  }
}
```

#### Success Button (Send Email)

```css
.button-success {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);

  width: 100%;
  padding: var(--padding-button);
  border: none;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;

  background-color: var(--color-success-600);
  color: #ffffff;
  cursor: pointer;
  transition: all 200ms ease;

  &:hover {
    background-color: var(--color-success-700);
    box-shadow: 0 4px 12px rgba(22, 163, 74, 0.2);
  }

  &:active {
    background-color: #15803d;
    transform: scale(0.98);
  }

  &.success-state {
    background-color: var(--color-success-700);
    animation: pulse-success 0.6s ease;
  }
}

@keyframes pulse-success {
  0% {
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(22, 163, 74, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0);
  }
}
```

#### Secondary Button

```css
.button-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);

  padding: var(--padding-button);
  border: 2px solid var(--border-medium);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 200ms ease;

  &:hover {
    border-color: var(--color-primary-600);
    background-color: var(--bg-tertiary);
  }

  &:active {
    transform: scale(0.98);
  }
}
```

### Input Controls

#### Text Input

```css
.input-text {
  width: 100%;
  padding: var(--padding-input);
  border: 2px solid var(--border-light);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  transition: all 200ms ease;

  &:hover {
    border-color: var(--border-medium);
  }

  &:focus {
    outline: none;
    border-color: var(--color-primary-600);
    background-color: var(--bg-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background-color: var(--bg-tertiary);
    color: var(--text-tertiary);
    cursor: not-allowed;
  }

  &::placeholder {
    color: var(--text-tertiary);
  }
}
```

#### Dropdown Select

```css
.select-dropdown {
  position: relative;
  width: 100%;

  .select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;

    width: 100%;
    padding: var(--padding-input);
    border: 2px solid var(--border-light);
    border-radius: 8px;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 200ms ease;

    &:hover {
      border-color: var(--border-medium);
    }

    &:focus {
      outline: none;
      border-color: var(--color-primary-600);
      background-color: var(--bg-primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  }

  .select-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: var(--spacing-xs);
    border: 2px solid var(--border-medium);
    border-radius: 8px;
    background-color: var(--bg-primary);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    z-index: 10;
    max-height: 200px;
    overflow-y: auto;

    &.hidden {
      display: none;
    }
  }

  .select-item {
    padding: var(--spacing-sm) var(--spacing-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
    transition: all 150ms ease;

    &:hover {
      background-color: var(--bg-secondary);
    }

    &.selected {
      background-color: var(--bg-tertiary);
      font-weight: 500;
      color: var(--color-primary-600);

      &:before {
        content: "✓";
        display: inline-block;
        margin-right: var(--spacing-sm);
        color: var(--color-success-600);
        font-weight: bold;
      }
    }
  }
}
```

#### Token Input (with visibility toggle)

```css
.input-token-container {
  position: relative;

  .input-token {
    width: 100%;
    padding: var(--padding-input);
    padding-right: 36px;
    border: 2px solid var(--border-light);
    border-radius: 8px;
    background-color: var(--bg-secondary);
    font-family: var(--font-family-mono);
    font-size: 12px;
    letter-spacing: 2px;
    color: var(--text-secondary);
    transition: all 200ms ease;

    &:focus {
      outline: none;
      border-color: var(--color-primary-600);
      background-color: var(--bg-primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  }

  .token-toggle-visibility {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    transition: all 150ms ease;

    &:hover {
      color: var(--text-primary);
    }
  }

  .token-validate {
    position: absolute;
    right: 40px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--color-success-600);
    cursor: pointer;
    padding: 4px;
    transition: all 150ms ease;

    &:hover {
      color: var(--color-success-700);
    }

    &.invalid {
      color: var(--color-error-600);
    }
  }
}
```

### Platform-Specific Components

#### Platform Card

```css
.platform-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border: 2px solid var(--border-light);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  cursor: pointer;
  transition: all 200ms ease;

  .platform-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    border-radius: 4px;
    background-color: transparent;
  }

  .platform-info {
    flex: 1;

    .platform-name {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-primary);
    }

    .platform-status {
      font-size: 12px;
      color: var(--text-tertiary);
      margin-top: 2px;
    }
  }

  .platform-switch {
    width: 40px;
    height: 24px;
    position: relative;
    background-color: var(--border-medium);
    border-radius: 12px;
    cursor: pointer;
    transition: all 200ms ease;

    &.active {
      background-color: var(--color-success-600);
    }

    &::after {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background-color: #ffffff;
      border-radius: 50%;
      transition: all 200ms ease;
    }

    &.active::after {
      left: 18px;
    }
  }

  &:hover {
    border-color: var(--color-primary-600);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
  }
}
```

#### Instance Configuration Panel

```css
.instance-config {
  border: 2px dashed var(--border-light);
  border-radius: 8px;
  padding: var(--spacing-md);
  background-color: var(--bg-tertiary);

  &.active {
    border-style: solid;
    border-color: var(--color-primary-600);
    background-color: rgba(59, 130, 246, 0.05);
  }

  &.error {
    border-color: var(--color-error-600);
    background-color: rgba(220, 38, 38, 0.05);
  }

  .config-group {
    margin-bottom: var(--spacing-md);

    &:last-child {
      margin-bottom: 0;
    }
  }

  label {
    display: block;
    margin-bottom: var(--spacing-xs);
  }

  input {
    margin-bottom: var(--spacing-sm);
  }

  .config-help {
    font-size: 11px;
    color: var(--text-tertiary);
    margin-top: var(--spacing-xs);
    line-height: 1.4;
  }
}
```

### Cards & Containers

#### Card

```css
.card {
  padding: var(--padding-card);
  background-color: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 200ms ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);

  h3 {
    margin: 0;
  }
}

.card-content {
  color: var(--text-secondary);
  line-height: 1.6;
}

.card-footer {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-light);
}
```

#### Tabs

```css
.tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--border-light);
  margin-bottom: var(--spacing-lg);

  .tab-button {
    padding: var(--spacing-md) var(--spacing-lg);
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: all 200ms ease;
    margin-bottom: -2px;

    &:hover {
      color: var(--text-primary);
    }

    &.active {
      border-bottom-color: var(--color-primary-600);
      color: var(--text-primary);
    }
  }
}
```

### Status Badges

#### Status Badge

```css
.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.2;

  &.badge-success {
    background-color: rgba(22, 163, 74, 0.2);
    color: var(--color-success-700);
  }

  &.badge-warning {
    background-color: rgba(217, 119, 6, 0.2);
    color: var(--color-warning-700);
  }

  &.badge-error {
    background-color: rgba(220, 38, 38, 0.2);
    color: var(--color-error-700);
  }

  &.badge-info {
    background-color: rgba(59, 130, 246, 0.2);
    color: var(--color-primary-700);
  }
}
```

### Form Groups

#### Form Section

```css
.form-section {
  margin-bottom: var(--spacing-lg);

  &:last-child {
    margin-bottom: 0;
  }

  label {
    display: block;
    margin-bottom: var(--spacing-sm);
  }

  .form-hint {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-top: var(--spacing-xs);
    line-height: 1.4;
  }

  .form-error {
    color: var(--color-error-600);
    font-size: 12px;
    margin-top: var(--spacing-xs);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
}
```

---

## 5. Responsive Design

### Breakpoints

```css
/* Mobile First Approach */
/* Default: < 360px (mobile popup) */

/* sm: 360px and up */
@media (min-width: 360px) {
  /* Tablet */
}

/* md: 640px and up */
@media (min-width: 640px) {
  /* Small desktop / side panel */
}

/* lg: 1024px and up */
@media (min-width: 1024px) {
  /* Large desktop */
}

/* xl: 1280px and up */
@media (min-width: 1280px) {
  /* Extra large desktop */
}
```

### Popup Responsive Design (360-420px)

```css
/* Base (mobile popup mode) */
.popup-container {
  width: 375px;
  height: 640px;
  display: flex;
  flex-direction: column;
}

.popup-header {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.popup-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
}

.popup-actions {
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-light);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

/* Adjust for max width */
@media (min-width: 420px) {
  .popup-container {
    width: 420px;
  }
}
```

### Side Panel Responsive Design (100vw)

```css
@media (min-width: 640px) {
  .mode-sidepanel {
    width: 100vw;
    height: 100vh;

    .layout-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      height: 100vh;
    }

    .sidepanel-sidebar {
      padding: var(--spacing-lg);
      border-right: 1px solid var(--border-light);
      overflow-y: auto;
    }

    .sidepanel-main {
      padding: var(--spacing-lg);
      overflow-y: auto;
    }
  }
}
```

---

## 6. Animation & Transitions

### Timing Functions

```css
:root {
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
  --easing-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-ease-out: cubic-bezier(0, 0, 0.2, 1);
  --easing-ease-in: cubic-bezier(0.4, 0, 1, 1);
}
```

### Button State Transitions

```css
button {
  transition: all var(--transition-fast);
}
```

### Loading State Animation

```css
@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spinner 1s linear infinite;
  display: inline-block;
}

.button.loading .spinner {
  margin-right: var(--spacing-sm);
}
```

### Success Checkmark Animation

```css
@keyframes checkmark {
  0% {
    transform: scale(0) rotate(-45deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1) rotate(0);
    opacity: 1;
  }
}

.icon-checkmark {
  animation: checkmark var(--transition-base);
  color: var(--color-success-600);
}
```

### Fade In Animation

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn var(--transition-base);
}
```

---

## 7. Accessibility

### Focus Styles

```css
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--color-primary-600);
  outline-offset: 2px;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast Mode

```css
@media (prefers-contrast: more) {
  :root {
    --border-light: #4a4a4a;
    --border-medium: #2a2a2a;
    --text-primary: #000000;
    --text-secondary: #333333;
  }
}
```

### Screen Reader Only Text

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## 8. Platform-Specific Styles

### GitHub Theme

```css
.platform-github {
  --platform-primary: #1f6feb;
  --platform-secondary: #30363d;

  .platform-header {
    background-color: var(--platform-primary);
  }

  .platform-icon {
    background-color: rgba(31, 111, 235, 0.1);
    color: var(--platform-primary);
  }
}
```

### GitLab Theme

```css
.platform-gitlab {
  --platform-primary: #fc6d26;
  --platform-secondary: #292961;

  .platform-icon {
    background-color: rgba(252, 109, 38, 0.1);
    color: var(--platform-primary);
  }
}
```

### Gitea Theme

```css
.platform-gitea {
  --platform-primary: #609926;

  .platform-icon {
    background-color: rgba(96, 153, 38, 0.1);
    color: var(--platform-primary);
  }
}
```

### Bitbucket Theme

```css
.platform-bitbucket {
  --platform-primary: #0052cc;

  .platform-icon {
    background-color: rgba(0, 82, 204, 0.1);
    color: var(--platform-primary);
  }
}
```

---

## 9. Usage Examples

### Form Example

```html
<div class="form-section">
  <label>GitHub Token</label>
  <div class="input-token-container">
    <input
      type="password"
      class="input-token"
      placeholder="Paste your GitHub personal access token"
    />
    <button class="token-toggle-visibility">👁</button>
    <button class="token-validate">✓</button>
  </div>
  <div class="form-hint">Keep your token secret. Learn how to create one →</div>
</div>
```

### Platform Selector Example

```html
<div class="platform-card">
  <div class="platform-icon">🐙</div>
  <div class="platform-info">
    <div class="platform-name">GitHub</div>
    <div class="platform-status">john-doe • Primary Account</div>
  </div>
  <div class="platform-switch active"></div>
</div>
```

### Action Buttons Example

```html
<div class="button-group">
  <button class="button-primary"><i class="fas fa-sync"></i> Generate</button>
  <button class="button-primary"><i class="fas fa-copy"></i> Copy</button>
  <button class="button-success">
    <i class="fas fa-envelope"></i> Send Report by Email
  </button>
</div>
```

---

## 10. Dark Mode Implementation

### Automatic Detection

```css
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    /* Dark mode variables automatically applied */
  }
}
```

### Manual Toggle

```css
body.dark-mode,
:root.dark-mode {
  color-scheme: dark;
  --bg-primary: #111827;
  /* ... other dark mode variables */
}
```

---

## Migration & Implementation Notes

1. Create a new `styles/design-system.css` file with all design tokens
2. Create `styles/components.css` for reusable component styles
3. Create `styles/platforms.css` for platform-specific styles
4. Import in popup.html in order: tokens → components → platform-specific
5. Update existing styles to use CSS variables
6. Test dark mode thoroughly
7. Test with screen readers (NVDA, JAWS, VoiceOver)
8. Validate color contrast ratios (WCAG AA minimum 4.5:1)

---

_Design System v1.0 - March 2024_
