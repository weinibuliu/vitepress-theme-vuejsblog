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

`pnpm dlx`、`yarn dlx` 和 `bunx` 同样可用；`init` 会自动识别当前使用的包管理器，
并据此生成脚本、锁文件字段与 CI 配置。

不带参数运行 `init` 时，它会询问无法自行推断的信息；在没有 TTY 的环境，或加上
`--yes` 时，则改用默认值。

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

## 脚手架选项

未通过参数传入的内容会以交互方式询问。

| 参数                         | 说明                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| `[directory]`                | 项目目录，默认为 `my-blog`                                        |
| `-y, --yes`                  | 跳过所有询问，全部使用默认值                                      |
| `-f, --force`                | 写入非空目录。只覆盖它自己生成的文件，不删除任何内容              |
| `-t, --title <text>`         | 博客标题，默认为目录名转换而来                                    |
| `-d, --description <text>`   | 一句话描述博客                                                    |
| `-a, --author <text>`        | 未署名文章的默认作者                                              |
| `-u, --base-url <url>`       | 站点 origin，例如 `https://example.com`，Feed 需要它              |
| `--lang <tag>`               | 界面与日期语言，默认 `en`                                         |
| `--preset <name>`            | 品牌配色：`default`（绿色）、`emerald`、`rose`、`violet`、`amber` |
| `--package-manager <m>`      | `pnpm`、`npm`、`yarn` 或 `bun`，默认自动识别                      |
| `--theme-version <range>`    | 覆盖 `vitepress-theme-vuejsblog` 的版本范围                       |
| `--install` / `--no-install` | 是否在生成后安装依赖。默认不安装                                  |
| `--git` / `--no-git`         | 是否 `git init` 并创建首次提交。默认不执行                        |
| `--deploy` / `--no-deploy`   | 是否写入部署配置。默认写入                                        |
| `-h, --help`                 | 显示 `init` 的选项                                                |
| `-v, --version`              | 显示版本                                                          |

有两处默认值刻意不对称：交互式运行时，安装依赖与初始化 git 都会询问且默认为「是」；
没有 TTY 或使用 `--yes` 时两者都关闭。它们是仅有的两个会触及新建目录之外的操作，
值得被明确询问而不是默认执行。

`--force` 是重新生成而非合并，因此用更少的参数再跑一次，会得到那些参数所描述的站点。

## 环境要求

Node `^20.19.0 || >=22.12.0`，与 VitePress 2 的要求一致。生成的项目固定
`vitepress@2.0.0-alpha.20`，因为主题读取 `globalThis.VITEPRESS_CONFIG.site`，
VitePress 1.x 并不提供。

`init` 命令本身没有构建步骤，运行时依赖
[`@clack/prompts`](https://www.npmjs.com/package/@clack/prompts)（交互提问）与
[`eta`](https://www.npmjs.com/package/eta)（模板渲染）。

## License

MIT
