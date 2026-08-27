# Soundwave Frontend

This repository contains the static React/Vite Soundwave client for GitHub Pages. It uses Supabase Auth in the browser and sends the active Supabase access token to the separate Render API. It never contains a database URL, OAuth client secret, Supabase secret key, YouTube key, or email credential.

## Deployment configuration

Set these **GitHub Actions repository variables** before enabling the Pages workflow. They are browser-safe configuration values, not privileged secrets.

| Variable | Purpose |
| --- | --- |
| `SOUNDWAVE_API_BASE_URL` | Exact public `https://…onrender.com` URL for the Soundwave API; no trailing slash. |
| `SOUNDWAVE_SUPABASE_URL` | Public Supabase project URL. |
| `SOUNDWAVE_SUPABASE_PUBLISHABLE_KEY` | Public Supabase publishable key. |

The workflow builds with Vite base `/soundwave-frontend/`, uploads only `dist`, creates a `404.html` SPA fallback, and deploys through GitHub Pages Actions. In repository **Settings → Pages**, select **GitHub Actions** as the source.

## Local validation

Create a private, untracked `.env` file with the three browser-safe variables listed above, then run `corepack enable && pnpm install && pnpm test && pnpm check && pnpm build`.

Commercial releases remain visible official YouTube embeds. The app does not extract commercial audio or hide the provider player.
