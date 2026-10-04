## Deploying

- **GitHub Pages** — `.github/workflows/deploy.yml` builds and publishes on every push
  to `main`. Turn on Pages for the repository with "GitHub Actions" as the source. A
  project site is served from `https://<user>.github.io/<repo>/`, so uncomment `base`
  in `.vitepress/config.ts` and name the repository.
- **Vercel** — `vercel.json` sets the build command and output directory, so importing
  the repository is enough.
