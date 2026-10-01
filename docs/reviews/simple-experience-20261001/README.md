# Simpler agent experience

These screenshots use the deterministic demo account and agent from
`e2e/fixtures/simple-experience.ts`. They contain no customer data, credentials
or real wallet balances. The demo API is a local review tool outside the app;
production continues using the existing authenticated backend.

- `desktop-home.png`: English, light theme, 1440 x 1000.
- `mobile-create.png`: Romanian, dark theme, 390-pixel viewport, full page.

Validation: type-check, lint, production build, 32 unit tests and 18 browser
tests. Browser tests use simulated API responses to verify creation payloads,
explicit confirmation, default/saved view modes, direct links, reload behavior,
editable prompts, search/filters, pricing, billing display and translations.
No real AI calls, agent creation or payments were performed by these tests.

The review found and fixed a pre-existing mode-switch inconsistency: returning
to Easy from a technical tab now updates the URL to Chat, so reload preserves
the visible conversation.
