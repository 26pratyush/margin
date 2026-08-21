import { openStorage } from './storage.mjs'
import { createSyntheticDataset } from './validation.mjs'

const action = process.argv[2]
const storage = await openStorage()

try {
  if (action === 'seed') {
    storage.replaceDataset(createSyntheticDataset())
    console.log(`Seeded synthetic data in ${storage.dataDirectory}`)
  } else if (action === 'reset') {
    storage.reset()
    console.log('Reset Margin local data; unrelated files were not touched.')
  } else if (action === 'status') {
    const dataset = storage.getDataset()
    console.log(
      `Margin data: ${dataset.entries.length} entries, ${dataset.commitments.length} commitments (${storage.databasePath})`,
    )
  } else {
    console.error('Usage: node service/cli.mjs <seed|reset|status>')
    process.exitCode = 1
  }
} finally {
  storage.close()
}
