import { mkdir, readFile, writeFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const packageManifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const hostSource = await readFile(new URL('src/index.js', root), 'utf8')
const clientSource = await readFile(new URL('src/client.js', root), 'utf8')

const clientBundle =
  'window.__ModuleLoader__.load({\n'
  + `  id: ${JSON.stringify(packageManifest.name)},\n`
  + '  factory: (require) => {\n'
  + '    const module = { exports: {} }\n'
  + '    const exports = module.exports\n'
  + clientSource
  + '\n    return module.exports\n'
  + '  }\n'
  + '})\n'

await mkdir(new URL('lib/', root), { recursive: true })
await writeFile(new URL('lib/index.js', root), hostSource)
await writeFile(new URL('lib/client.js', root), clientBundle)
