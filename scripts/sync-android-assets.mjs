import { access, cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '..')
const sourceDir = path.join(rootDir, 'dist-android')
const targetDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'web')

async function assertExists(directory) {
  try {
    await access(directory)
  } catch {
    throw new Error(`Android web build output is missing: ${directory}`)
  }
}

async function main() {
  await assertExists(sourceDir)
  await rm(targetDir, { recursive: true, force: true })
  await mkdir(targetDir, { recursive: true })
  await cp(sourceDir, targetDir, { recursive: true })

  console.log(`Synced Android web assets to ${targetDir}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
