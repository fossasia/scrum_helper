# Rules for AI-assisted contributions

Scrum Helper accepts AI-assisted contributions, but all submissions must meet project standards. The contributor submitting the PR is fully responsible for correctness, scope, and validation.

For setup and contribution process details, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Required rules

### 1) Understand and explain every change

- You must be able to explain what changed, why it changed, and how it interacts with existing code paths (popup, service worker/background, content scripts, GitHub API, i18n, and browser-specific build outputs).
- If you cannot explain a change, do not submit it.

### 2) Keep changes minimal and in scope

- Keep PRs tightly scoped to the stated bugfix or improvement.
- Do not include unrelated cleanup, drive-by refactors, formatting-only churn, or file moves unrelated to the task.
- Do not modify generated outputs or unrelated files unless the task explicitly requires it.

### 3) No new feature without a linked issue

- New features must reference a linked GitHub issue in the PR.
- If no issue exists, open one first and align scope before implementation.
- Bug fixes and maintenance changes should still include clear problem context in the PR description.

### 4) No blind AI output

- Do not paste AI-generated code without reviewing and testing it.
- Follow existing architecture, naming, structure, and error-handling patterns in nearby code.
- Reuse existing helpers before adding new abstractions or duplicate implementations.

### 5) Mandatory validation before PR update

Run these commands locally after your changes and before opening/updating a PR:

```sh
npm run lint
npm run check
npm run build
```

Additional expectations:

- If lint/check fails, fix issues before requesting review.
- Reload and verify the built extension from `dist/chrome` and/or `dist/firefox` for the user-facing behavior you changed.
- Validate edge cases relevant to your change (empty states, missing token/auth, API failures, rate limits, and large result sets where applicable).

## Pull request requirements

- Use a clear PR title and description with problem, approach, and validation evidence.
- List the exact validation steps you ran and outcomes.
- If maintainer feedback conflicts with an AI suggestion, follow maintainer direction.

## Why these rules exist

- Reduce maintainer overhead from speculative or low-signal PRs.
- Prevent regressions from unverified AI-generated changes.
- Keep the codebase consistent, reviewable, and aligned with project direction.
# Rules for AI-assisted contributions

Scrum Helper accepts AI-assisted contributions, but all submissions must meet project standards. The contributor submitting the PR is fully responsible for correctness, scope, and validation.

For setup and contribution process details, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Required rules

### 1) Understand and explain every change

- You must be able to explain what changed, why it changed, and how it interacts with existing code paths (popup, service worker/background, content scripts, GitHub API, i18n, and browser-specific build outputs).
- If you cannot explain a change, do not submit it.

### 2) Keep changes minimal and in scope

- Keep PRs tightly scoped to the stated bugfix or improvement.
- Do not include unrelated cleanup, drive-by refactors, formatting-only churn, or file moves unrelated to the task.
- Do not modify generated outputs or unrelated files unless the task explicitly requires it.

### 3) No new feature without a linked issue

- New features must reference a linked GitHub issue in the PR.
- If no issue exists, open one first and align scope before implementation.
- Bug fixes and maintenance changes should still include clear problem context in the PR description.

### 4) No blind AI output

- Do not paste AI-generated code without reviewing and testing it.
- Follow existing architecture, naming, structure, and error-handling patterns in nearby code.
- Reuse existing helpers before adding new abstractions or duplicate implementations.

### 5) Mandatory validation before PR update

Run these commands locally after your changes and before opening/updating a PR:

```sh
npm run lint
npm run check
npm run build
```

Additional expectations:

- If lint/check fails, fix issues before requesting review.
- Reload and verify the built extension from `dist/chrome` and/or `dist/firefox` for the user-facing behavior you changed.
- Validate edge cases relevant to your change (empty states, missing token/auth, API failures, rate limits, and large result sets where applicable).

## Pull request requirements

- Use a clear PR title and description with problem, approach, and validation evidence.
- List the exact validation steps you ran and outcomes.
- If maintainer feedback conflicts with an AI suggestion, follow maintainer direction.

## Why these rules exist

- Reduce maintainer overhead from speculative or low-signal PRs.
- Prevent regressions from unverified AI-generated changes.
- Keep the codebase consistent, reviewable, and aligned with project direction.
# Guidelines for AI-assisted contributions

Scrum Helper welcomes contributors who use AI coding assistants, code generators, or similar tools. These guidelines set the same bar we apply to any contribution: **the author is responsible for the change**, including how it fits the project, whether it works, and how it behaves at the edges.
For environment setup, linting, releases, and general process, see [CONTRIBUTING.md](CONTRIBUTING.md).
## What we expect
### You understand what you submit
- You can explain **what** changed, **why** it is needed, and **how** it interacts with existing code paths (popup, background/service worker, content scripts, GitHub API usage, i18n, build output for Chrome vs Firefox, etc.).
- You can walk through the flow during review without relying on the tool that produced the draft.
### No unverified or blindly applied output
- Do not paste generated code into a PR without **running and exercising** the relevant behavior locally.
- Prefer small, reviewable commits over large speculative refactors “because the model suggested it.”
- If generated code introduces new dependencies, APIs, or patterns, justify them against current project conventions.
### Fit the existing architecture
- Read nearby code and follow **existing** naming, structure, error handling, and UI patterns.
- Use the project’s **build pipeline** (`npm run build` → `dist/chrome` and `dist/firefox`); avoid one-off paths that only work when loading raw `src/`.
- Keep changes **scoped** to the issue or feature: avoid unrelated cleanup, reformatting outside touched files, or duplicate features that already exist.
### Validation, edge cases, and regressions
- Consider **empty states**, auth/token absence, API errors, rate limits, large result sets, and different browsers (Chromium vs Gecko) where applicable.
- After changes, **reload the built extension** and verify the user-facing behavior you touched.
- Run automated checks before opening or updating a PR:
  ```sh
  npm run lint
  npm run check
  npm run build
  ```
  Use `npm run fix` or `npm run format` where appropriate; see [CONTRIBUTING.md](CONTRIBUTING.md) for details.
### Duplication and unnecessary scope
- Search the codebase for **existing helpers** or features before adding new ones.
- Do not add alternate implementations of the same behavior “for clarity” unless there is a concrete maintainability gain agreed in an issue.
## Pull requests
- Use a **clear title** and description: problem, approach, how it was tested, and any tradeoffs.
- If review feedback contradicts an earlier AI suggestion, **prioritize project direction** from maintainers over the model’s default answer.
- Be ready to **update tests or manual verification steps** if maintainers ask. Absence of automated tests does not remove the need to demonstrate correctness.
## Why this matters
- Reduces maintainer time spent reversing speculative or incompatible changes.
- Improves signal in reviews and keeps the codebase consistent for all contributors.
- Makes AI tooling a **productivity aid**, not a substitute for judgment and verification.
Thank you for helping keep Scrum Helper reliable and easy to maintain.
