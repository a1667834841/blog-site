# blog-site

This repository owns the Hugo + PaperMod site shell for `ggball`. It intentionally does not ship article content.

## Requirements

- Hugo must be installed locally. Check with `hugo version`.
- The PaperMod theme is tracked as a git submodule.

## Bootstrap setup

1. Clone this repository.
2. Initialize submodules:

   ```bash
   git submodule update --init --recursive
   ```

3. Build the bootstrap:

   ```bash
   hugo --source .
   ```

## Base URL

`hugo.yaml` keeps `baseURL` at `/` so the bootstrap is safe across environments. Set the real deployment URL at build time, for example:

```bash
hugo --source . --baseURL https://next.ggball.top/
```

## Content boundary

The `content/` path is intentionally unmanaged in this repository and is ignored here. Task 2+ should populate `content/` from the separate `blog-content` repository outside this repo's tracked files, either with a local checkout/worktree copied or synced into place for development, or with equivalent CI wiring during deployment.

Until that content repository is attached, this bootstrap is expected to build with theme scaffolding only.

## GitHub Pages

This repository includes a GitHub Pages workflow at `.github/workflows/deploy-pages.yml`.

The workflow expects a repository variable named `BLOG_CONTENT_REPO`, whose value is the public GitHub repo slug for the content repository, for example:

```text
a1667834841/blog-content
```

Setup details are documented in [docs/github-pages.md](/Users/wuwenjing/Documents/blog-site/docs/github-pages.md).

Cloudflare custom-domain cutover notes are in [docs/cloudflare-cutover.md](/Users/wuwenjing/Documents/blog-site/docs/cloudflare-cutover.md).

Cloudflare Pages deployment settings are documented in [docs/cloudflare-pages.md](/Users/wuwenjing/Documents/blog-site/docs/cloudflare-pages.md).
