# `www.ggball.top` 切换到 Cloudflare Pages

这份记录适用于当前单仓库模式：

- GitHub 仓库：`a1667834841/blog-site`
- 文章内容：本仓库 `content/`
- 线上域名：`https://www.ggball.top/`

## 推荐设置

优先使用 `www.ggball.top` 作为博客主域名：

- `www` 指向 Cloudflare Pages 项目
- `ggball.top` 可以通过 Cloudflare Redirect Rule 跳转到 `https://www.ggball.top/`

## Cloudflare Pages

在 Pages 项目中：

1. 连接 `a1667834841/blog-site`
2. Production branch 选择 `main`
3. Build command 设置为 `./scripts/build-cloudflare.sh`
4. Build output directory 设置为 `public`
5. 环境变量设置 `SITE_BASE_URL=https://www.ggball.top/`

## 自定义域名

在 Pages 项目中：

1. 打开 `Custom domains`
2. 添加 `www.ggball.top`
3. 按提示让 Cloudflare 创建或更新 DNS 记录

## 根域名重定向

如果希望 `https://ggball.top` 跳转到 `https://www.ggball.top`：

1. 打开 Cloudflare 的 `Rules`
2. 进入 `Redirect Rules`
3. 创建匹配条件：

   ```text
   Hostname equals ggball.top
   ```

4. 重定向目标：

   ```text
   https://www.ggball.top${uri}
   ```

5. 状态码选择 `301`

## 验证清单

1. `https://www.ggball.top/` 可以打开博客首页
2. `https://www.ggball.top/search/` 可以搜索
3. `https://www.ggball.top/index.xml` 返回 RSS
4. 推送 `content/` 下的新文章后，Cloudflare Pages 自动创建新部署
5. Cloudflare SSL/TLS 模式在部署稳定后使用 `Full` 或 `Full (strict)`
