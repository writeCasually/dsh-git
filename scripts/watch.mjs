import { spawn } from 'node:child_process'
import { watch } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const sourceDir = fileURLToPath(new URL('../src/', import.meta.url))
let timer

function rebuild() {
  const child = spawn(process.execPath, ['scripts/build.mjs'], {
    cwd: root,
    stdio: 'inherit',
  })
  child.on('error', (error) => {
    console.error(`dsh-git watch: build failed to start: ${error.message}`)
  })
}

rebuild()
console.log(`dsh-git watch: watching ${sourceDir}`)
watch(sourceDir, { recursive: true }, () => {
  clearTimeout(timer)
  timer = setTimeout(rebuild, 50)
})
