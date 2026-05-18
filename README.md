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
