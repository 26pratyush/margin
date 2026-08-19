import { readFile, unlink, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixturePath = resolve(repoRoot, 'app', 'src', 'demo', 'fixture.json')
const generatedDirectory = resolve(repoRoot, 'app', 'public')
const generatedPath = resolve(generatedDirectory, 'demo-data.json')

function assertExpectedTarget() {
  const expectedPath = resolve(repoRoot, 'app', 'public', 'demo-data.json')
  if (generatedPath !== expectedPath) {
    throw new Error(`Refusing to operate on unexpected path: ${generatedPath}`)
  }
}

async function readFixture() {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'))
  if (fixture.format !== 'margin-demo' || fixture.schemaVersion !== 1) {
    throw new Error(`Invalid synthetic fixture at ${fixturePath}`)
  }

  return fixture
}

async function seed() {
  assertExpectedTarget()
  const fixture = await readFixture()
  await mkdir(generatedDirectory, { recursive: true })
  await writeFile(generatedPath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8')
  console.log(`Seeded synthetic demo data at ${generatedPath}`)
}

async function reset() {
  assertExpectedTarget()

  try {
    const current = JSON.parse(await readFile(generatedPath, 'utf8'))
    if (current.format !== 'margin-demo') {
      throw new Error(`Refusing to remove a non-demo file at ${generatedPath}`)
    }
    await unlink(generatedPath)
    console.log(`Removed synthetic demo data at ${generatedPath}`)
  } catch (error) {
    if (error?.code === 'ENOENT') {
      console.log('Synthetic demo data is already reset.')
      return
    }
    throw error
  }
}

async function status() {
  assertExpectedTarget()

  try {
    const fixture = JSON.parse(await readFile(generatedPath, 'utf8'))
    console.log(`Synthetic demo data is seeded (${fixture.entries.length} entries, ${fixture.commitments.length} commitments).`)
  } catch (error) {
    if (error?.code === 'ENOENT') {
      console.log('Synthetic demo data is not seeded.')
      return
    }
    throw error
  }
}

const action = process.argv[2]

if (action === 'seed') {
  await seed()
} else if (action === 'reset') {
  await reset()
} else if (action === 'status') {
  await status()
} else {
  console.error('Usage: node scripts/demo.mjs <seed|reset|status>')
  process.exitCode = 1
}
