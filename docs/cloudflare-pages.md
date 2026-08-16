# Cloudflare Pages 部署说明

本仓库已经合并文章内容，Cloudflare Pages 只需要监听 `a1667834841/blog-site`。以后文章变更、图片变更和站点代码变更都会出现在同一个仓库提交中，因此推送到 `main` 后会自动触发部署。

## 项目设置

在 Cloudflare Pages 中使用以下配置：

- Production branch：`main`
- Framework preset：`Hugo`
- Build command：`./scripts/build-cloudflare.sh`
- Build output directory：`public`
- Root directory：留空

## 环境变量

建议添加：

```text
HUGO_VERSION=0.159.2
SITE_BASE_URL=https://www.ggball.top/
```

说明：

- `HUGO_VERSION` 用来固定 Cloudflare 的 Hugo 版本，保持本地和线上一致。
- `SITE_BASE_URL` 用来生成正确的 canonical URL、RSS 和 sitemap 地址。

不再需要 `CONTENT_REPO_GIT_URL`，也不需要让构建流程克隆 `blog-content`。

## 构建流程

`./scripts/build-cloudflare.sh` 现在只做一件事：

```bash
hugo --gc --minify --baseURL "$SITE_BASE_URL"
```

如果没有设置 `SITE_BASE_URL`，脚本会回退到 Cloudflare 提供的 `CF_PAGES_URL`，再回退到 `/`。

## 触发部署

Cloudflare Pages 会在以下场景创建新部署：

- 推送新提交到 `main`
- 推送新提交到预览分支
- 在 Cloudflare 控制台手动重试或重新部署

新增文章时请直接提交到本仓库的 `content/` 目录，这样 Cloudflare 能看到提交记录。

## 自定义域名

部署成功后：

1. 打开 Pages 项目
2. 进入 `Custom domains`
3. 添加 `www.ggball.top`
4. 按 Cloudflare 提示创建或更新 DNS 记录

如果还需要根域名：

1. 添加 `ggball.top`
2. 或只保留 `www.ggball.top`，再创建从 `ggball.top` 到 `https://www.ggball.top` 的重定向规则

## 本地一致性检查

```bash
cd /Users/wuwenjing/codes/web/blog-site
SITE_BASE_URL=https://www.ggball.top/ ./scripts/build-cloudflare.sh
```
