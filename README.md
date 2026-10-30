# sportscam-web

Read-only phone viewer for the sportscam OneDrive match folder (ADR-0030 D12, ADR-0033).
Vite + React 18 + TypeScript (strict), `@azure/msal-browser`, `zod`. One route, no router, no server.

**Requirements covered:** DL-M2 (website half).

## What it does
Sign in (MSAL `loginRedirect`, authority `common`), resolve the shared folder `Recording_90-8`
(from the configured view-only sharing link through `GET /shares/u!.../driveItem`, ADR-0035;
cached in `localStorage` per account; the manual "Paste sharing link" input appears only if the
configured link fails), list `Recording_*` match folders that carry `match.json` (newest first), and play each
half's `outputs/output_1080p.mp4` from `@microsoft.graph.downloadUrl`. A "Requests" footer toggle
shows the Graph request log, granted scopes, the folder resolution and first-frame timings
(never a token or a download URL). Scopes are exactly `User.Read`, `Files.Read.All`,
`offline_access`; `graphFetch` is GET-only; there is no write path to OneDrive.

## Configuration: `VITE_SHARED_FOLDER_LINK`
A **view-only** sharing link to `Recording_90-8`, in `.env.production` / `.env.development`,
committed like the client id (public configuration, not a secret). The human supplies it; the
value `REPLACE_WITH_VIEW_LINK` is a placeholder and is treated as "not configured". Resolution
order: `localStorage` cache, then the configured link, then (only if the link is missing, is the
placeholder, or `/shares` returns non-2xx) the manual paste input, which uses the same call and
cache. `sharedWithMe` and owner search were removed (ADR-0035, superseding ADR-0033 D1).

## Run
```
npm ci
npm run dev          # http://localhost:5173/sportscam-web/
npm run lint
npm test             # Vitest, no network, no account
npx playwright install chromium   # once
npm run e2e          # phone-width check at 390x844, writes e2e/out/phone-390.png
npm run build        # tsc, vite build, copies dist/index.html to dist/404.html
```
The e2e run and the unit tests inject a test auth provider (`window.__TEST_AUTH__`, honoured by
the dev server only) and intercept Graph; MSAL is not involved.

## Contract
`tests/fixtures/app/{session.v1.json,match.v1.json,sync.app_clock.json}` are verbatim copies from
the pipeline repository (`tests/fixtures/app/`), pinned by SHA-256 in
`tests/contracts.fixtures.test.ts`. Never edit them here; request a schema change from the
architect. Types and zod decoders are in `src/contracts.ts`.

## Deploy (human)
`.github/workflows/pages.yml` builds and deploys to GitHub Pages on every push to `main`.
Repository Settings, Pages, Source = "GitHub Actions". Site URL: https://tjrov-hub.github.io/sportscam-web/

## App registration (human, already done; public values, no secret)
- Owned by the project account's own directory, name `sportscam`, multi-tenant + personal accounts.
- Client id `d1ff5d1e-c987-497c-ba01-e63395786d54` (in `.env.production`).
- Platform: single-page application; redirect URIs `https://tjrov-hub.github.io/sportscam-web/`
  and `http://localhost:5173/`.
- Delegated permissions `User.Read`, `Files.Read.All`, `offline_access`. No client secret.
- Authority used by the viewer: `https://login.microsoftonline.com/common` (not the tenant id).
- Configuration: `VITE_CLIENT_ID`, `VITE_AUTHORITY`, `VITE_REDIRECT_URI`, `VITE_SHARED_FOLDER_NAME`.
