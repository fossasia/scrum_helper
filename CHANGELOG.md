# Changelog

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/).

---

## [2.0.0] - 2025-07-19

### Major Revamp

This release marks a significant milestone with a full UI overhaul, Manifest V3 migration, GitHub workflow automation, and performance improvements across the board.

#### Added
- Migrated to Chrome Manifest V3 ensuring long-term browser compatibility and background service worker support (#59).
- Introduced multi-client Google account support, improving reliability across user sessions (#62).
- Added a one-click Scrum report generator UI (#76).
- New UI design: dark mode, settings section, better layout spacing, modern component styling (#83).
- GitHub Action for PR/issue labeling to automate triaging (#101).
- Release drafter GitHub workflow for automated changelog generation (#97).
- New GitHub templates for issues and pull requests (#99).
- Visible org name in the UI for quick org switching (#141).
- Tooltip for project names to improve UI accessibility on narrow screens (#175).
- Auto-sync fork workflow added to help contributors stay up-to-date (#183).
- Separate labels for merged vs. unmerged pull requests for better report clarity (#165).
- Ability to fetch all GitHub activities, not just a subset (#168).
- New icon for the extension (#130).

#### Changed
- Overhauled email subject injection for Yahoo/Outlook clients to fix inconsistencies (#86, #107, #138).
- Refactored date selection UI to prevent bugs and align with new design standards (#152, #173).
- Moved `showCommits` toggle to the report section for better discoverability (#192).
- Improved organization selector UI/UX (#164).
- Simplified repo scope selection logic to be org-aware (#171).
- Navigation revamp with Home button, consistent route behavior (#143).
- Switched from REST API to GitHub GraphQL for commits — faster and within rate limits (#147).
- Optimized API calls for better performance (#133, #118).
- Enhanced selectors for scrum injection to work more reliably across different email clients (#90).
- Replaced ESLint with Biome for code formatting and linting (#60).

#### Fixed
- UI feedback bugs on checkbox selection (#71).
- Popup tabs rendering inconsistently fixed (#78).
- Email subject no longer shows `"false"` when state is uninitialized (#116).
- Scrum messages now inject only into new drafts, not replies (#109).
- Fixed caching issues causing session/context loss (#180).
- Repo list dropdown closes properly on selection (#198).
- Toggle logic for filters corrected (#204).
- Manifest/config syntax cleaned up (#132, #150).
- Spellings standardized to "organization" (#158).
- Scrum reports are now correctly generated when the extension is first loaded (#153).
- Resolved an issue with using multiple Google accounts simultaneously (#124).
- Corrected date interval logic in scrum helper (#40).

#### Removed
- "Blockers" UI section removed for redundancy (#195).
- Reverted premature `showCommits` commit (re-added later correctly) (#131).

#### Documentation
- Developer guide improved: clearer onboarding, structure, contribution steps (#64).
- Firefox setup guide added (#127).
- Issue templates moved to `.github/ISSUE_TEMPLATE` (#113).
- Updated README with new screenshots, instructions, and formatting (#92, #96, #146, #199).

#### Breaking Changes
- Chrome MV2 → MV3: major architectural changes; contributors must update environments (#59).
- Internal settings & commit APIs were restructured. Older DOM-based customizations may break.

#### Upgrade Notes
- Remove older build before installing this.
- Clear storage/cache after upgrade.

---

## [1.9.0] - 2025-06-15

### Features
- GitHub org selector UI redesigned for clarity (#164).
- Report filters now reflect selected repo state instantly (#143).
- Added auto-label workflow using GitHub Actions (#101).
- Added initial Home view layout for upcoming UI upgrade (#83).

### Fixes
- Removed incorrect email content when replying instead of drafting (#109).
- Addressed minor caching and selection persistence bugs (#150).

---

## [1.8.0] - 2025-06-01

### Features
- Added email subject injection logic for Yahoo (#86).
- Firefox support guide added for contributors (#127).
- Enabled project tooltips to handle overflow and narrow UIs (#175).

### Fixes
- Squashed UI bugs related to narrow screen layout shifts (#152).
- Date picker issues fixed for manual selection (#173).

---

## [1.7.0] - 2025-05-10

### Improvements
- Introduced `showCommits` toggle for scrum reports (#131).
- Added UI state persistence across sessions via local storage (#116).
- Fixed organization dropdown selection bug (#138).

### Refactoring
- Cleaned up `manifest.json` to remove deprecated entries (#132).
- Replaced verbose field names with concise identifiers internally.

---

## [1.6.0] - 2025-04-22

### Additions
- GitHub REST API integration added for commit history (#108).
- Extension popup layout redesigned for better readability (#92).

### Fixes
- Scrum reports now generate for selected repositories only (#96).
- Default org fallback behavior corrected (#99).

---

## [1.5.0] - 2025-04-01

### Enhancements
- Introduced new sidebar layout prototype (experimental) (#83).
- PR template created for better contributor formatting (#99).
- GitHub Actions configured for PR sync workflow (initial draft) (#97).

---

## [1.4.0] - 2025-03-20

### Stability & Usability
- Added repo dropdown filter logic fix (#78).
- README restructured with updated use cases and images (#92).

---

## [1.3.0] - 2025-03-01

### Experimental
- GraphQL prototype implemented for commit fetch (feature branch) (#147).
- Added developer docs index structure (#64).

---

## [1.2.0] - 2025-02-15

### UI Changes
- Button spacing & style normalized across popup and settings (#76).
- Scroll behavior stabilized inside the dropdowns and settings (#71).

---

## [1.1.0] - 2019-01-25

### Features
- Scrum message generation integrated with Gmail draft composer (#62).
- Initial GitHub integration for authenticated org repo listing.

---

## [1.0.0] - 2018-12-01

Initial release of Scrum Helper Chrome Extension with:
- Scrum report generation from GitHub issues/PRs.
- Gmail injection for weekly updates.
- Basic organization and repo selection.
