{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": [
      "ES2022",
      "DOM"
    ],
    "types": [
      "node"
    ],
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": [
    ".vitepress/**/*.ts",
    ".vitepress/**/*.mts"
  ],
  "exclude": [
    "node_modules",
    ".vitepress/cache",
    ".vitepress/dist"
  ]
}
