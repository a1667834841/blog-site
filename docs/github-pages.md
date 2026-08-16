# GitHub Pages 部署说明

本仓库保留 GitHub Pages 工作流作为备用部署方式。文章内容已经在 `blog-site` 仓库内，不再需要从 `blog-content` 拉取内容。

## 1. 初始化子模块

首次克隆后执行：

```bash
git submodule update --init --recursive
```

## 2. 启用 GitHub Pages

在 `blog-site` 仓库中：

1. 打开 `Settings`
2. 打开 `Pages`
3. 将 `Source` 设置为 `GitHub Actions`

之后推送到 `main` 或 `master` 会触发 `.github/workflows/deploy-pages.yml`。

## 3. 可选域名变量

如果使用自定义域名，可以在仓库变量中添加：

```text
SITE_BASE_URL=https://www.ggball.top/
```

这样 Hugo 会用最终域名生成 canonical URL、RSS 和 sitemap。

## 4. 自定义域名

在 `blog-site -> Settings -> Pages` 中：

1. 将 `Custom domain` 设置为 `www.ggball.top`
2. 等待 GitHub 完成域名校验
3. 开启 `Enforce HTTPS`

使用 GitHub Actions 部署 Pages 时，GitHub 的 `Custom domain` 字段就是域名配置来源，不需要额外提交 `CNAME` 文件。

## 5. 本地检查

```bash
cd /Users/wuwenjing/codes/web/blog-site
hugo --gc --minify
```

## 工作流摘要

- 检出 `blog-site`
- 初始化 PaperMod 子模块
- 安装 Hugo
- 直接构建仓库内的 `content/`
- 上传 `public/` 并部署到 GitHub Pages
