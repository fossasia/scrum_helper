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
