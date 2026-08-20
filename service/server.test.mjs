import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createMarginServer } from './server.mjs'

async function startServer(directory) {
  const context = await createMarginServer({ dataDirectory: directory })
  await new Promise((resolve) => context.server.listen(0, '127.0.0.1', resolve))
  const address = context.server.address()
  return { ...context, url: `http://127.0.0.1:${address.port}` }
}

function clientHeaders() {
  return { 'Content-Type': 'application/json', 'X-Margin-Client': 'browser' }
}

test('exposes health and persists a seeded dataset through the HTTP boundary', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-http-test-'))
  const context = await startServer(directory)
  try {
    const health = await fetch(`${context.url}/api/health`).then((response) => response.json())
    assert.equal(health.status, 'ok')

    const seed = await fetch(`${context.url}/api/seed`, { method: 'POST', headers: clientHeaders(), body: '{}' })
    assert.equal(seed.status, 200)

    const dataset = await fetch(`${context.url}/api/dataset`).then((response) => response.json())
    assert.equal(dataset.entries.length, 2)
    assert.equal(dataset.commitments.length, 1)
  } finally {
    await new Promise((resolve) => context.server.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
})

test('rejects mutating requests without the browser client header', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-http-header-test-'))
  const context = await startServer(directory)
  try {
    const response = await fetch(`${context.url}/api/reset`, { method: 'POST', body: '{}' })
    assert.equal(response.status, 403)
  } finally {
    await new Promise((resolve) => context.server.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
})

test('previews and restores a versioned backup through the HTTP boundary', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-http-backup-test-'))
  const context = await startServer(directory)
  try {
    await fetch(`${context.url}/api/seed`, { method: 'POST', headers: clientHeaders(), body: '{}' })
    const backup = await fetch(`${context.url}/api/backup`).then((response) => response.json())
    assert.equal(backup.formatVersion, 2)

    const preview = await fetch(`${context.url}/api/backup/validate`, { method: 'POST', headers: clientHeaders(), body: JSON.stringify(backup) }).then((response) => response.json())
    assert.equal(preview.counts.entries, 2)

    await fetch(`${context.url}/api/reset`, { method: 'POST', headers: clientHeaders(), body: '{}' })
    const restored = await fetch(`${context.url}/api/backup/restore`, { method: 'POST', headers: clientHeaders(), body: JSON.stringify(backup) }).then((response) => response.json())
    assert.equal(restored.summary.recoverySnapshotCreated, true)

    const dataset = await fetch(`${context.url}/api/dataset`).then((response) => response.json())
    assert.equal(dataset.entries.length, 2)
  } finally {
    await new Promise((resolve) => context.server.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
})

test('persists a reconciliation adjustment and snapshot through the HTTP boundary', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-http-reconcile-test-'))
  const context = await startServer(directory)
  try {
    await fetch(`${context.url}/api/seed`, { method: 'POST', headers: clientHeaders(), body: '{}' })
    const response = await fetch(`${context.url}/api/reconcile`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({ asOf: '2026-08-20', realBalanceMinor: 9800000, note: 'Bank balance check' }),
    })
    const result = await response.json()

    assert.equal(response.status, 201)
    assert.equal(result.snapshot.adjustmentEntryId, result.adjustment.id)
    assert.equal(result.dataset.balanceSnapshots.length, 1)
    assert.equal(result.dataset.entries.length, 3)
  } finally {
    await new Promise((resolve) => context.server.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
})
