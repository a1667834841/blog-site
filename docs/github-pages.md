# GitHub Pages Deployment

This site repo is deployed by GitHub Actions and pulls content from the public `blog-content` repository at build time.

## 1. Push both repositories to GitHub

- `blog-site`: Hugo + PaperMod shell + workflow
- `blog-content`: Markdown content + static assets + migration scripts

## 2. Set the content repository variable

In the `blog-site` GitHub repository:

1. Open `Settings`
2. Open `Secrets and variables`
3. Open `Actions`
4. Create a repository variable named `BLOG_CONTENT_REPO`
5. Set the value to the public content repository slug, for example:

```text
a1667834841/blog-content
```

## 3. Enable GitHub Pages

In the `blog-site` GitHub repository:

1. Open `Settings`
2. Open `Pages`
3. Set `Source` to `GitHub Actions`

After that, pushing to `main` or `master` will trigger `.github/workflows/deploy-pages.yml`.

## 4. Optional base URL override

If you plan to use a custom domain, add another repository variable:

```text
SITE_BASE_URL=https://www.ggball.top/
```

This makes Hugo generate canonical links, RSS links, and sitemap URLs with the final public domain instead of the temporary `github.io` address.

## 5. Custom domain

In the `blog-site` GitHub repository:

1. Open `Settings`
2. Open `Pages`
3. Set `Custom domain` to:

```text
www.ggball.top
```

4. Save
5. Wait for GitHub Pages to verify the domain
6. Then enable `Enforce HTTPS`

For GitHub Actions based Pages deployment, the `Custom domain` field in GitHub is the source of truth, so a tracked `CNAME` file is not required.

## 6. Local parity checks

Before pushing:

```bash
cd /Users/wuwenjing/Documents/blog-site
CONTENT_REPO=/Users/wuwenjing/Documents/blog-content ./scripts/sync-content.sh
hugo --gc --minify
```

## Workflow summary

- The workflow checks out `blog-site`
- It initializes the PaperMod submodule
- It checks out the public `blog-content` repo into a temporary folder
- It runs `./scripts/sync-content.sh`
- It builds Hugo
- It uploads `public/` and deploys with GitHub Pages
