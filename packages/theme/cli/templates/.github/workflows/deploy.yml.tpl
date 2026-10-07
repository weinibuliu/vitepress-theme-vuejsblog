name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6.1.0

<% if (packageManager === 'pnpm') { %>      - name: Setup pnpm
        uses: pnpm/action-setup@v6.1.0
        with:
          cache: true

<% } else if (packageManager === 'bun') { %>      - name: Setup bun
        uses: oven-sh/setup-bun@v2.2.0

<% } %><% if (packageManager !== 'bun') { %>      - name: Setup Node
        uses: actions/setup-node@v6.5.0
        with:
          node-version: 22

<% } %>      - name: Install Dependence
        run: <%= installCommand %>

      - name: Build Dist
        run: <%= buildCommand %>

      - name: Setup Pages
        uses: actions/configure-pages@v6.0.0
        with:
          enablement: true

      - uses: actions/upload-pages-artifact@v5.0.0
        with:
          path: .vitepress/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5.0.0
