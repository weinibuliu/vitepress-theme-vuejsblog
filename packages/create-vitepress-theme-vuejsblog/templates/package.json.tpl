{
  "name": <%= json(packageName) %>,
  "version": "0.0.0",
  "private": true,
  "type": "module",
<% if (packageManager === 'pnpm') { %>  "packageManager": <%= json(`pnpm@${pnpmVersion}`) %>,
<% } %>  "scripts": {
    "dev": "vitepress dev",
    "build": "vitepress build",
    "preview": "vitepress preview"
  },
  "devDependencies": {
    "@types/node": <%= json(nodeTypesVersion) %>,
    "vitepress": <%= json(vitepressVersion) %>,
    <%= json(themePackage) %>: <%= json(themeVersion) %>,
    "vue": <%= json(vueVersion) %>
  }
}
