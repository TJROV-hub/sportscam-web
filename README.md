# sportscam-web

Read-only phone viewer for the sportscam OneDrive match folder (ADR-0030 D12, ADR-0033).
Vite + React 18 + TypeScript (strict), `@azure/msal-browser`, `zod`. One route, no router, no server.

**Requirements covered:** DL-M2 (website half).

## What it does
Sign in (MSAL `loginRedirect`, authority `common`), resolve the shared folder `Recording_90-8`
(`sharedWithMe`, then owner search, then a pasted sharing link; cached in `localStorage` per
account), list `Recording_*` match folders that carry `match.json` (newest first), and play each
half's `outputs/output_1080p.mp4` from `@microsoft.graph.downloadUrl`. A "Requests" footer toggle
shows the Graph request log, granted scopes, the folder resolution and first-frame timings
(never a token or a download URL). Scopes are exactly `User.Read`, `Files.Read.All`,
`offline_access`; `graphFetch` is GET-only; there is no write path to OneDrive.

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
