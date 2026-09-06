# Customer UI reset proof — 5 September 2026

Branch: `codex/customer-ui-reset`. Local only; not committed, merged, pushed or deployed.

Removed: old customer landing/configurator/crafting/studio/commerce rendering, six review skins and shared flow, static preview, customer selector components and global customer styling, saved UI preview images, UX wireframe/share packet, Omran proposed wireframe and flow. Retired customer browser scenarios with their removed functionality; retained operator scenario and all backend/unit tests. Customer root is blank; existing palette remains. Scoped client hydration to the operator page so the blank customer page does not initialize the old flow.

Preserved: backend/API/domain/provider implementation, operator UI and its used styles, commerce readiness policy, security and credentials, original private evidence, attributed Omran feedback (`OMRAN-BUSINESS-CONTEXT.md`), jewelry catalog moved to `docs/reference/jewelry/catalog-stills`, other jewelry R&D. Existing unrelated `.mcp.json`, database type edits, and unrelated untracked directories were left alone.

Context: START-HERE now leads with the reset and business evidence. Old product/architecture contracts explicitly do not approve the replacement UI. The preserved feedback is from a source-attributed brief; raw voice transcripts have not been reverified. The old UI remains recoverable in Git history but is not authority for the next brainstorm.

Validation:
- `next typegen` followed by `pnpm --filter @jewelo/web typecheck`: PASS. Initial stale generated route types were regenerated after route removal.
- `pnpm --filter @jewelo/web lint`: PASS.
- `git diff --check`: PASS.
- `pnpm --filter @jewelo/web test`: 42 pass, 3 fail in untouched code: document unavailable in Supabase client test, Diwani support expectation, Shopify error-message expectation. No assertions weakened.
- `playwright test --project=desktop`: blocked before browser launch by missing pinned Chromium headless-shell executable. Earlier attempt also encountered the running dev-server lock; rerun after stopping that server reached the missing-browser blocker. Operator test retained unchanged; no authenticated operator end-to-end pass claimed.
- Local HTTP: /en and /ar 200; /en/operator 200; /en/design/new, /en/design/crafting, /en/studio/example, /en/commerce/example, /en/review/v1, /en/review/v6 and /review/preview.html return 404.
- In-app Browser: blank customer main verified; operator login form renders. Old six preview tabs closed. Static preview server stopped. Development app restarted on 3001, PROVIDER_MODE=mock, with process-only optional-empty-analytics normalization; .env unchanged.

Next: brainstorm business requirements and source feedback with Sanchay. Do not implement a replacement UI automatically. No paid calls, production actions, or new account permissions.
