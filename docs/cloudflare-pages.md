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

For this repo, the standard production trigger is a push to `main`.

## Daily content sync trigger

This repo also includes:

- `.github/workflows/sync-content-fingerprint.yml`
- `.github/content-sync-state.json`
- `scripts/fingerprint-content.mjs`

The GitHub workflow runs every day at `00:10` Beijing time (`16:10 UTC` on the previous day).

It does not rebuild the site itself. Instead, it:

1. checks out `blog-content`
2. computes a `sha256` fingerprint across `content/`, `static/`, and `data/`
3. compares that fingerprint with the last synced value in `.github/content-sync-state.json`
4. pushes a tiny state-file commit to `blog-site/main` only when content changed

Because Cloudflare Pages is connected to `blog-site` and deploys on pushes to `main`, that tiny commit is enough to trigger a fresh Pages deployment only when the content repository actually changed.

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
