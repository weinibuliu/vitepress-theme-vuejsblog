# vitepress-theme-vuejsblog

> [!NOTE]
> 该主题基于 vitepress@2.0.0-alpha.20 开发，不保证对其他版本兼容。

一个基于 [blog.vuejs.org](https://blog.vuejs.org) 风格的 Vitepress 主题。

[Demo](https://weinibuliu.github.io/vitepress-theme-vuejsblog) | [使用引导](https://weinibuliu.github.io/vitepress-theme-vuejsblog/docs/zh-cn/welcome)

## 快速开始

### 从脚手架开始 (推荐)

主题自带 `vitepress-theme-vuejsblog init` 命令，会生成一个已经接好本主题的项目：
配置、示例内容、品牌色与部署配置。

```bash
npx vitepress-theme-vuejsblog init my-blog
cd my-blog
npm install
npm run dev
```

生成的项目：

```
my-blog/
├── .github/workflows/deploy.yml   构建并发布到 GitHub Pages
├── .vitepress/
│   ├── config.ts                  站点配置：标题、作者、导航、页脚、Feed
│   └── theme/
│       ├── index.ts               把主题交给 VitePress
│       └── theme.css              品牌色与自定义样式
├── index.md                       博客首页
├── about.md                       一个 Page 示例
├── posts/
│   ├── hello-world.md             一篇 Post
│   └── a-draft.md                 一篇 Draft：开发时可见，构建时排除
├── public/logo.svg                导航图标与 favicon
├── vercel.json                    Vercel 无需额外配置
├── package.json
└── tsconfig.json
```

### 手动安装

```bash
pnpm add vitepress@2.0.0-alpha.20 vue vitepress-theme-vuejsblog
```

## License

[MIT](https://github.com/weinibuliu/vitepress-theme-vuejsblog/blob/main/LICENSE)
