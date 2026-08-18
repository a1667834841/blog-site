# blog-site

这是 `ggball` 博客的 Hugo + PaperMod 站点仓库，现在同时管理站点外壳和文章内容。

## 仓库内容

- `content/`：文章、笔记、项目页、归档页和关于页
- `static/images/`：文章图片等静态资源
- `data/`：站点数据
- `scripts/`：文章生成、迁移和内容检查脚本
- `layouts/`、`assets/`、`hugo.yaml`：Hugo 站点配置和主题扩展

文章内容已经从原来的 `blog-content` 仓库合并进来。之后新增或修改文章时，直接提交到本仓库即可触发 Cloudflare Pages 重新部署。

## 本地准备

1. 克隆仓库。
2. 初始化 PaperMod 子模块：

   ```bash
   git submodule update --init --recursive
   ```

3. 确认本地已安装 Hugo：

   ```bash
   hugo version
   ```

## 本地构建

```bash
hugo --gc --minify
```

如果要模拟线上域名：

```bash
SITE_BASE_URL=https://www.ggball.top/ ./scripts/build-cloudflare.sh
```

## 新建文章

使用内容脚本创建带完整 frontmatter 的 Markdown 文件：

```bash
node scripts/new-article.mjs --section posts --title "Redis缓存实践"
```

支持的 s`ection：

- `posts`
- `notes`
- `monthly`
- `projects`

也可以指定路径：

```bash
node scripts/new-article.mjs \
  --section notes \
  --title "Spring事务传播行为" \
  --path content/notes/spring/spring事务传播行为.md
```

检查 frontmatter：

```bash
node scripts/scan-content-frontmatter.mjs
```

## Cloudflare Pages

Cloudflare Pages 只需要绑定 `a1667834841/blog-site`。

推荐配置：

- Production branch：`main`
- Framework preset：`Hugo`
- Build command：`./scripts/build-cloudflare.sh`
- Build output directory：`public`
- Root directory：留空

环境变量：

```text
HUGO_VERSION=0.159.2
SITE_BASE_URL=https://www.ggball.top/
```

推送文章或站点代码到 `main` 后，Cloudflare Pages 会识别到 `blog-site` 的新提交并自动部署。

## GitHub Pages

仓库仍保留 `.github/workflows/deploy-pages.yml` 作为备用部署方式。启用时只需要在 GitHub Pages 中选择 `Source = GitHub Actions`，不再需要配置 `BLOG_CONTENT_REPO`。
