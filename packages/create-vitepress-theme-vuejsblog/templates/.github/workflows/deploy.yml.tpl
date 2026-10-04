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

%s
      - name: Install Dependence
        run: %s

      - name: Build Dist
        run: %s

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
