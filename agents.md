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
