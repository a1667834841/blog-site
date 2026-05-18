# Cloudflare Pages Deployment

This repo can be deployed directly from Cloudflare Pages while still keeping `blog-content` as a separate public repository.

## Recommended model

- Connect `a1667834841/blog-site` to a Cloudflare Pages project
- During build, clone `a1667834841/blog-content`
- Sync content into the Hugo working tree
- Build and publish from `public/`

That keeps the dual-repo structure intact and avoids GitHub Pages custom-domain friction.

## Project settings

In Cloudflare Pages, use these values:

- Production branch: `main`
- Framework preset: `Hugo`
- Build command: `./scripts/build-cloudflare.sh`
- Build output directory: `public`
- Root directory: leave empty

## Environment variables

Add these environment variables to the Pages project:

```text
HUGO_VERSION=0.159.2
CONTENT_REPO_GIT_URL=https://github.com/a1667834841/blog-content.git
SITE_BASE_URL=https://www.ggball.top/
```

Notes:

- `HUGO_VERSION` keeps Cloudflare's Hugo version aligned with local builds.
- `CONTENT_REPO_GIT_URL` points to the public content repo.
- `SITE_BASE_URL` makes canonical URLs, RSS, and sitemap use the final domain.

## Build flow

`./scripts/build-cloudflare.sh` does the following:

1. Clone `blog-content`
2. Run `./scripts/sync-content.sh`
3. Run `hugo --gc --minify --baseURL "$SITE_BASE_URL"`

## Custom domain

After the Pages project is deployed successfully:

1. Open the Pages project
2. Open `Custom domains`
3. Add `www.ggball.top`
4. Let Cloudflare create or update the DNS record automatically if prompted

If you also want the apex root:

1. Add `ggball.top`
2. Or add only `www.ggball.top` and create a redirect rule from `ggball.top` to `https://www.ggball.top`

## When Cloudflare Pages deploys

Cloudflare Pages normally creates a new deployment when:

- you push a new commit to the configured production branch
- you push a new commit to a preview branch
- you manually retry or redeploy from the Cloudflare dashboard
- you trigger a deploy hook

For this repo, the standard production trigger is a push to `main`.

## GitHub scheduled redeploy

This repo also ships with:

- `.github/workflows/trigger-cloudflare-pages.yml`

It runs on:

- manual dispatch
- a daily cron at `02:10 UTC`

The workflow calls a Cloudflare Pages deploy hook, so you can force a fresh Pages build even when there is no new commit.

### Setup

In the Cloudflare Pages project:

1. Open `Settings`
2. Open `Builds & deployments`
3. Create a `Deploy hook`
4. Copy the generated hook URL

In the GitHub `blog-site` repository:

1. Open `Settings`
2. Open `Secrets and variables`
3. Open `Actions`
4. Create a repository secret named:

```text
CLOUDFLARE_PAGES_DEPLOY_HOOK_URL
```

5. Paste the deploy hook URL as the secret value

After that, GitHub will trigger Cloudflare Pages automatically on schedule.

## Included edge optimizations

This repo now ships with:

- `static/_headers`
  - long cache for hashed assets and images
  - short cache for RSS and sitemap
  - security headers
  - `noindex` for the internal search page
- `static/_redirects`
  - permanent redirect from `https://ggball.top/*` to `https://www.ggball.top/:splat`

These files are picked up automatically by Cloudflare Pages during deploy.

## Local parity check

This roughly matches the Cloudflare build:

```bash
cd /Users/wuwenjing/Documents/blog-site
CONTENT_REPO_GIT_URL=https://github.com/a1667834841/blog-content.git \
SITE_BASE_URL=https://www.ggball.top/ \
./scripts/build-cloudflare.sh
```
