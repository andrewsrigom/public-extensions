# Changelog

## Unreleased

- Revalidated the active origin before cleanup and inside injected page-storage operations.
- Reported partial browser-data failures instead of showing a false success.
- Cleared regular cookies for every path and explicitly removed partitioned cookies for the active top-level site.
- Separated cache cleanup from optional offline-site data cleanup.

## 0.1.0 - 2026-07-15

- Added current-site detection from the active tab.
- Added user-confirmed removal of cookies, browser cache, local storage, Cache Storage, IndexedDB, and service workers.
- Added cleanup for partitioned cookies associated with the active top-level site, with a safe fallback on older APIs.
- Added category selection and clear status feedback.
- Added English, Portuguese, and Spanish interface support.
- Removed an unused `activeTab` permission before the first release.
