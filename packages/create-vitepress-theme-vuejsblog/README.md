# create-vitepress-theme-vuejsblog

Scaffold a VitePress blog with
[`vitepress-theme-vuejsblog`](https://www.npmjs.com/package/vitepress-theme-vuejsblog)
already wired up: config, sample content, brand colour and deploy config.

```bash
# npm — the flags come after a `--`, see below
npm create vitepress-theme-vuejsblog@latest my-blog

# pnpm, yarn and bun — flags go on the end as written
pnpm create vitepress-theme-vuejsblog@latest my-blog
```

`pnpm create`, `yarn create` and `bun create` forward the options as written:
`pnpm create vitepress-theme-vuejsblog@latest my-blog --yes`.

npm is the exception. It parses the command line before the initialiser ever starts, and
`--yes`, `--force` and `--help` are names npm answers to itself, so through npm an option
only arrives after a lone `--` — the same one every other `create-` package's README asks
for:

```bash
npm create vitepress-theme-vuejsblog@latest my-blog -- --yes
```

Without the `--`, npm consumes the flag and the scaffolder simply never hears it: a
`--yes` run asks its questions anyway, and `--title Notes` arrives as a second directory.
The scaffolder says so when it can tell npm was the caller.

With no arguments the scaffolder asks for the things it cannot guess; in a shell with no
TTY, or with `--yes`, it uses the defaults instead of hanging.

## What you get

```
my-blog/
├── .github/workflows/deploy.yml   builds and publishes to GitHub Pages
├── .vitepress/
│   ├── config.ts                  the Blog: title, author, nav, footer, Feed
│   └── theme/
│       ├── index.ts               hands the Theme to VitePress
│       └── theme.css              brand colour and your own styling
├── index.md                       the Blog index
├── about.md                       a Page, to show what one looks like
├── posts/
│   ├── hello-world.md             a Post
│   └── a-draft.md                 a Draft: listed in dev, absent from a build
├── public/logo.svg                the nav mark and the favicon
├── vercel.json                    so Vercel needs no configuration
├── package.json
└── tsconfig.json
```

The generated Site carries a `README.md` of its own explaining how to write posts and
deploy. The Theme's README documents everything under `themeConfig.blog`.

## Options

Anything not passed as a flag is asked for interactively. Under npm, a flag without the
leading `--` described above is read by npm rather than by this CLI.

| Flag                         | Meaning                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `[directory]`                | Where to write the Site. Default `my-blog`                                                            |
| `-y, --yes`                  | Skip every prompt and use the defaults                                                                |
| `-f, --force`                | Write into a non-empty directory. Only the files it generates are overwritten, and nothing is deleted |
| `-t, --title <text>`         | Blog title. Defaults to the directory name, title-cased                                               |
| `-d, --description <text>`   | One line describing the blog                                                                          |
| `-a, --author <text>`        | Default Author for posts that credit none                                                             |
| `-u, --base-url <url>`       | Site origin, e.g. `https://example.com`. The Feed needs it                                            |
| `--lang <tag>`               | Interface and date language. Default `en`                                                             |
| `--preset <name>`            | Brand palette: `default` (green), `emerald`, `rose`, `violet`, `amber`                                |
| `--package-manager <m>`      | `pnpm`, `npm`, `yarn` or `bun`. Detected by default                                                   |
| `--theme-version <range>`    | Override the `vitepress-theme-vuejsblog` version range                                                |
| `--install` / `--no-install` | Run the package manager's install. Off unless asked                                                   |
| `--git` / `--no-git`         | `git init` and a first commit. Off unless asked                                                       |
| `--deploy` / `--no-deploy`   | Write the deploy config. On by default                                                                |
| `-h, --help`                 | Show the options                                                                                      |
| `-v, --version`              | Show the version                                                                                      |

Two defaults are deliberately asymmetric. Interactively, installing and initialising git
are both offered and default to yes. Without a TTY, or with `--yes`, both are off: they are
the only two steps that touch anything outside the directory just written, so they are
worth being asked about rather than assumed.

`--force` regenerates rather than merges, so a second run with fewer flags produces the
Site those flags describe.

## Requirements

Node `^20.19.0 || >=22.12.0`, the same range VitePress 2 needs. The generated Site pins
`vitepress@2.0.0-alpha.20`, because the Theme reads `globalThis.VITEPRESS_CONFIG.site`,
which VitePress 1.x does not provide.

The scaffolder itself has no build step. Its two runtime dependencies are
[`@clack/prompts`](https://www.npmjs.com/package/@clack/prompts), for the questions, and
[`eta`](https://www.npmjs.com/package/eta), for the templates.

## License

MIT
