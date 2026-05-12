# SCM provider foundation

This folder is the shared foundation for Scrum Helper's SCM provider architecture.

The goal is to move from scattered GitHub/GitLab conditionals toward one provider system that future contributors can extend safely. This foundation is intentionally lightweight: it defines platform ids, provider registration, provider metadata, and shared storage-key helpers without moving fetching or report generation behavior yet.

All incremental PRs for this architecture should use `Part of #627`, not `Fixes #627`.

## Mental model

The future flow should look like this:

```text
popup/main
  -> selected platform id

provider registry
  -> returns provider definition

provider implementation
  -> builds URLs, fetches SCM data, handles provider-specific API behavior

normalizer
  -> converts provider API responses into a shared report activity shape

report generator
  -> renders the shared activity shape
```

## Folder responsibilities

### `platforms.js`

Defines canonical platform ids.

Use these ids instead of repeating raw platform strings in new SCM code.

### `providerRegistry.js`

Owns the single SCM provider registry exposed as `window.scmProviders`.

Use this registry to:

- register providers
- look up a provider by platform id
- list provider ids
- list provider definitions

Do not create a second SCM registry.

### `storageKeys.js`

Owns provider-aware storage key helpers.

Use this when code needs a platform-specific storage key, for example the selected platform's username key.

### `providers/`

Owns provider definitions.

For this foundation PR, GitHub and GitLab providers only register metadata. Future PRs can add behavior to these provider definitions incrementally.

### `normalizers/`

Reserved for provider response normalizers.

Normalizers should convert provider API responses into Scrum Helper's shared report activity shape. They should not fetch data, read popup DOM, write storage, or render report HTML.

### `cache/`

Reserved for provider-aware cache key helpers and cache contracts.

Cache helpers should not fetch provider data or render report output.

## Provider definition shape

Metadata fields are part of the current foundation contract:

```js
{
	id,
	displayName,
	iconClass,
	usernameLabelI18nKey,
	visibleSettingsSection,
	visibleSectionClass,
	storageKeys,
}
```

Metadata fields:

- `id`: Stable provider id used in storage and registry lookups, for example `github` or `gitlab`.
- `displayName`: Human-readable platform name shown in the platform dropdown.
- `iconClass`: Font Awesome class used for the platform icon.
- `usernameLabelI18nKey`: i18n message key for the username label.
- `visibleSettingsSection`: Existing settings section identifier used by current popup visibility logic.
- `visibleSectionClass`: CSS class for provider-specific settings sections, for example `githubOnlySection`.
- `storageKeys`: Provider-specific browser storage keys. This PR currently uses `storageKeys.username`.

Behavior fields are reserved names for future provider implementation PRs. They are not fully finalized yet and should evolve only when a PR actually wires the behavior into GitHub/GitLab code paths:

```js
{
	createProvider,
	buildActivityUrls,
	buildHeaders,
	buildUserUrl,
	buildSearchUrl,
	fetchActivity,
	normalizeActivity,
	clearCache,
}
```

Future behavior fields:

- `createProvider`: Optional factory for creating a provider implementation with runtime config.
- `buildActivityUrls`: Provider-specific URL builder for activity/report API requests.
- `buildHeaders`: Provider-specific request header builder, including auth token handling.
- `buildUserUrl`: Provider-specific URL builder for user/profile API requests.
- `buildSearchUrl`: Provider-specific URL builder for issue, pull request, or merge request search APIs.
- `fetchActivity`: Provider-specific method for fetching raw SCM activity data.
- `normalizeActivity`: Provider-specific method for converting raw API data to the shared report activity shape.
- `clearCache`: Provider-specific method for clearing in-memory and stored provider cache data.

Do not add behavior fields until the PR actually uses them.

Provider behavior can be implemented as plain methods on the provider definition when no runtime state is needed. If a provider needs runtime configuration or state, such as API base URLs, tokens, helper instances, or cache objects, use `createProvider(config)` to return a provider instance.

## Current scope

The current foundation supports existing GitHub and GitLab UI metadata:

- platform dropdown label and icon
- platform dropdown options
- username label i18n key
- GitHub-only/GitLab-only settings visibility
- username storage key lookup

It intentionally does not change:

- GitHub fetching
- GitLab fetching
- report generation
- cache behavior
- host permissions
- generated `dist` files

## Parallel contributor guidance

Future provider work should build on this foundation:

- GitHub URL/header extraction should extend `providers/githubProvider.js`.
- GitLab provider wrapping should extend `providers/gitlabProvider.js`.
- GitHub response mapping should go under `normalizers/`.
- GitLab response mapping should go under `normalizers/`.
- Provider cache key helpers should go under `cache/`.

New SCMs such as Gitea or Bitbucket should be added only after the provider contract is stable for GitHub and GitLab.
