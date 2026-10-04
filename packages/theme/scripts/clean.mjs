import path from 'node:path'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)
const target = path.join(packageRoot, 'dist')

rmSync(target, { recursive: true, force: true })
console.log(`[theme] cleaned ${path.relative(packageRoot, target)}`)
