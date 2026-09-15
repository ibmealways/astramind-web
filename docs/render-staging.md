# Render staging deployment

The repository includes `render.yaml` for a single Render web service that builds the React client and serves it from the Express backend.

## Create staging

1. In Render, create a new Blueprint and connect `ibmealways/astramind-web`.
2. Render detects `render.yaml` and creates `aigenikz-intelligence-os-staging` from `main`.
3. Enter staging or test-mode values for every variable marked `sync: false`.
4. After deployment, verify `/api/health`, account registration and sign-in, chat, content generation, billing checkout, and Stripe webhook processing.

Never enter live Stripe credentials in staging. Use Stripe test-mode secret, prices, and webhook signing secret.

## Storage limitation

The Blueprint intentionally starts on Render's free plan. Its filesystem is ephemeral, so accounts, project data, and other SQLite records can disappear after a restart or deployment. Use it only for staging validation.

Before production, change to a paid Render web-service plan and attach a persistent disk at:

`/opt/render/project/src/storage`

Both `AIGENIKZ_AUTH_DB_PATH` and `AIGENIKZ_PLATFORM_DB_PATH` already point beneath that mount path. A service with an attached disk runs as a single instance, which matches SQLite's single-host design.

## Optional providers

Web search is disabled by default. Enable it only after adding a staging Tavily key. The local video provider remains the default until a hosted video provider and its credentials are configured.