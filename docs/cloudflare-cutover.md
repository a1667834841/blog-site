# Cloudflare Cutover for `www.ggball.top`

This runbook assumes:

- GitHub repository: `a1667834841/blog-site`
- GitHub Pages is already enabled with `Source = GitHub Actions`
- `BLOG_CONTENT_REPO=a1667834841/blog-content`
- `SITE_BASE_URL=https://www.ggball.top/`

## Recommended setup

Use `www.ggball.top` as the public blog hostname first.

That keeps the DNS setup simple:

- `www` -> `a1667834841.github.io` via `CNAME`
- `ggball.top` can later redirect to `https://www.ggball.top/`

## GitHub side

In `blog-site -> Settings -> Pages`:

1. Set `Custom domain` to `www.ggball.top`
2. Wait until GitHub verifies the domain
3. Enable `Enforce HTTPS`

## Cloudflare DNS

In Cloudflare DNS for `ggball.top`, add:

```text
Type: CNAME
Name: www
Target: a1667834841.github.io
Proxy status: DNS only
TTL: Auto
```

Notes:

- `DNS only` is the safest first step for GitHub Pages hostname verification.
- After GitHub domain verification succeeds and HTTPS works, you can test turning the record orange-cloud if you specifically want Cloudflare proxy in front.
- If Cloudflare proxy causes certificate or verification friction, switch back to `DNS only`.

## Root domain redirect

If you want `https://ggball.top` to jump to `https://www.ggball.top`, do it in Cloudflare:

1. Open `Rules`
2. Open `Redirect Rules`
3. Create a rule that matches:

```text
Hostname equals ggball.top
```

4. Redirect to:

```text
https://www.ggball.top${uri}
```

5. Status code: `301`

## Validation checklist

After DNS updates:

1. `https://a1667834841.github.io/blog-site/` still works
2. `https://www.ggball.top/` opens the new Hugo site
3. `https://www.ggball.top/search/` works
4. `https://www.ggball.top/index.xml` returns RSS
5. GitHub Pages shows the custom domain as active
6. Cloudflare SSL/TLS mode is `Full` or `Full (strict)` once everything is healthy

## Suggested order

1. Push latest `blog-site`
2. Set `SITE_BASE_URL=https://www.ggball.top/`
3. Re-run the Pages workflow
4. Set GitHub Pages custom domain to `www.ggball.top`
5. Add the `www` CNAME in Cloudflare as `DNS only`
6. Wait for verification and HTTPS
7. Add apex redirect from `ggball.top` to `www.ggball.top`

