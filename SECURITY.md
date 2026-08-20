# Security Policy

## Supported code

Security fixes are made on the default branch. Published extension releases are supported on a best-effort basis until a
newer release supersedes them. Please verify that a report still applies to the latest code before submitting it.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use the repository's
[private vulnerability reporting form](https://github.com/andrewsrigom/public-extensions/security/advisories/new) instead.
Include, when possible:

- the affected extension, version, browser, and operating system;
- a minimal reproduction or proof of concept;
- the impact and realistic attack scenario;
- any suggested remediation; and
- whether the issue is already public or subject to a disclosure deadline.

Remove credentials, tokens, personal email, browsing history, and other personal data from the report. Test only with
accounts and systems you own or are authorized to use.

You should receive an acknowledgement within three business days and a status update within seven business days. These
targets are best effort and may vary with severity and reproducibility. Please allow time for investigation and a
coordinated fix before disclosure.

## Security boundaries

Browser extensions operate with user-granted permissions and on third-party pages that can change without notice. A
report is especially useful when it demonstrates one of the following:

- unintended access to browsing data or site content;
- privilege or host-permission escalation;
- unsafe message passing between extension contexts;
- injection, credential exposure, or cross-origin data leakage;
- dependency or build-pipeline compromise; or
- a bypass of a documented user confirmation or safety boundary.

General support requests, feature proposals, and expected behavior should use the public issue templates.
