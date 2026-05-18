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
   hugo --source /Users/wuwenjing/Documents/blog-site
   ```

## Base URL

`hugo.yaml` keeps `baseURL` at `/` so the bootstrap is safe across environments. Set the real deployment URL at build time, for example:

```bash
hugo --source /Users/wuwenjing/Documents/blog-site --baseURL https://next.ggball.top/
```

## Content boundary

The `content/` path is intentionally unmanaged in this repository. Task 2+ should attach the separate `blog-content` repository at `content/` before running Hugo, either through a checkout/submodule in local development or equivalent CI wiring during deployment.

Until that content repository is attached, this bootstrap is expected to build with theme scaffolding only.
