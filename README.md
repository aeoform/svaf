# 云外拾光

一个精简后的 SvelteKit 静态站点，只保留主页、博客、RSS、站点地图与基础前端交互。

## 技术栈

- **SvelteKit**
- **shadcn-svelte**
- **Tailwind CSS v4**
- **TypeScript**

## 开发

```bash
pnpm dev
```

```bash
pnpm build
```

```bash
pnpm preview
```

## 项目结构

```
src/
├── content/         # 公告与文章内容
├── lib/             # 公共组件与工具
├── routes/          # 首页、博客、RSS、sitemap
└── app.css          # 全局样式
```

## 当前保留功能

- 首页
- 博客列表
- 文章详情
- RSS
- sitemap
- robots.txt
