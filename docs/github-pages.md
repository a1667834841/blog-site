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

## 4. Optional custom domain

If you want GitHub Pages to serve a custom domain directly, add a `CNAME` file under `static/`.

Example:

```text
www.ggball.top
```

Then configure the same hostname in the repository `Pages` settings and point DNS to GitHub Pages.

## 5. Local parity checks

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

