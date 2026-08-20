# Chrome Web Store Submission Notes

## Listing Draft

### Name

PathSwitch

### Short Description

Redirect matching pages automatically with private, local rules that you control.

### Detailed Description

PathSwitch automatically sends matching pages to the URL you prefer using redirect rules that stay in your browser.

Features:

- create wildcard source patterns such as `amazon.com/*`;
- choose a full destination URL for each rule;
- enable or pause all redirects or individual rules;
- restrict a rule to the exact source host;
- prevent loops when the browser is already at the destination;
- use the interface in English, Portuguese, or Spanish.

Visited URLs are compared with enabled rules locally and are not stored as browsing history. The extension does not send URLs, rules, settings, or browsing activity to a remote server.

## Privacy Tab

### Single Purpose

Redirect top-level web navigations that match rules created and enabled by the user.

### Permission Justifications

- `storage`: saves redirect rules and interface preferences locally.
- `webNavigation`: observes top-level navigations so enabled rules can be matched before redirecting.
- `<all_urls>`: lets user-created rules work on any HTTP or HTTPS source website.

Remote code: select **No, I am not using remote code**.

Suggested conservative data declaration: **Web history** because top-level navigation URLs are processed for immediate rule matching. PathSwitch does not retain a browsing-history log or transmit URLs. There is no sale, sharing, advertising, or human access.

Privacy policy URL after the file is public:

`https://github.com/andrewsrigom/browser-extensions/blob/main/apps/pathswitch/PRIVACY.md`

## Required Assets

- 128x128 icon: included in the ZIP at `icons/icon-128.png`.
- At least one 1280x800 or 640x400 screenshot showing a safe example redirect rule.
- One 440x280 small promotional image.

Use example domains in listing screenshots and avoid exposing private internal URLs.

## Manual Release Checklist

1. Run `pnpm pathswitch:release:check`.
2. Load `apps/pathswitch/.output/chrome-mv3` unpacked in Chrome.
3. Test wildcard, exact-host, disabled-rule, and global-pause behavior.
4. Test loop prevention and invalid destinations.
5. Confirm only top-level navigations are redirected.
6. Upload `apps/pathswitch/.output/pathswitch-0.1.0-chrome.zip`.
7. Fill the listing, privacy, and distribution tabs with the copy above.
8. Start as Unlisted or with trusted testers, then submit for review.
