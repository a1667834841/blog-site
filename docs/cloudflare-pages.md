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

## Local parity check

This roughly matches the Cloudflare build:

```bash
cd /Users/wuwenjing/Documents/blog-site
CONTENT_REPO_GIT_URL=https://github.com/a1667834841/blog-content.git \
SITE_BASE_URL=https://www.ggball.top/ \
./scripts/build-cloudflare.sh
```

