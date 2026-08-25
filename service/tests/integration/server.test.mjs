import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createMarginServer } from '../../server.mjs'

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

test('creates salary and expense records and exposes the updated summary', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-http-entry-test-'))
  const context = await startServer(directory)
  try {
    const salary = await fetch(`${context.url}/api/entries`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({ type: 'income', amountMinor: 10000000, occurredOn: '2026-08-01', source: 'Salary' }),
    })
    assert.equal(salary.status, 201)

    const expense = await fetch(`${context.url}/api/entries`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({
        type: 'expense',
        amountMinor: 125000,
        occurredOn: '2026-08-02',
        name: 'Lunch',
        categoryName: 'Food',
      }),
    })
    const expenseBody = await expense.json()
    assert.equal(expense.status, 201)
    assert.equal(expenseBody.entry.name, 'Lunch')
    assert.equal(expenseBody.entry.categoryId, expenseBody.category.id)

    const summary = await fetch(`${context.url}/api/summary`).then((response) => response.json())
    assert.equal(summary.incomeMinor, 10000000)
    assert.equal(summary.expenseMinor, 125000)
    assert.equal(summary.actualBalanceMinor, 9875000)
    assert.equal(summary.disposableBalanceMinor, 9875000)
  } finally {
    await new Promise((resolve) => context.server.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
})

test('creates and updates a planning cycle through the service boundary', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-http-planning-test-'))
  const context = await startServer(directory)
  try {
    await fetch(`${context.url}/api/entries`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({ type: 'income', amountMinor: 10000000, occurredOn: '2026-08-01', source: 'Salary' }),
    })
    const created = await fetch(`${context.url}/api/planning-cycles`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({ cycleKey: '2026-08', expectedSalaryMinor: 10000000, expectedSalaryOn: '2026-08-01' }),
    })
    const createdBody = await created.json()
    assert.equal(created.status, 201)
    assert.equal(createdBody.cycle.id, '2026-08')
    assert.equal(createdBody.summary.actualSalaryMinor, 10000000)

    const listed = await fetch(`${context.url}/api/planning-cycles`).then((response) => response.json())
    assert.deepEqual(
      listed.cycles.map((cycle) => cycle.cycleKey),
      ['2026-08'],
    )

    const updated = await fetch(`${context.url}/api/planning-cycles/2026-08`, {
      method: 'PUT',
      headers: clientHeaders(),
      body: JSON.stringify({ expectedSalaryMinor: 12000000 }),
    })
    const updatedBody = await updated.json()
    assert.equal(updated.status, 200)
    assert.equal(updatedBody.cycle.expectedSalaryMinor, 12000000)
    assert.equal(updatedBody.summary.salaryVarianceMinor, -2000000)

    const invalid = await fetch(`${context.url}/api/planning-cycles`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({ cycleKey: '2026-08', expectedSalaryMinor: 0 }),
    })
    assert.equal(invalid.status, 400)
    assert.equal((await invalid.json()).error, 'VALIDATION_ERROR')
  } finally {
    await new Promise((resolve) => context.server.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
})

test('reserves money as a planned saving without changing the actual balance', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-http-reserve-test-'))
  const context = await startServer(directory)
  try {
    await fetch(`${context.url}/api/entries`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({ type: 'income', amountMinor: 10000000, occurredOn: '2026-08-01', source: 'Salary' }),
    })

    const reserved = await fetch(`${context.url}/api/collections/commitments`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({
        id: 'planned-emergency-fund',
        kind: 'saving',
        name: 'Emergency fund',
        plannedAmountMinor: 3000000,
        dueOn: '2026-08-01',
        status: 'planned',
        linkedEntryIds: [],
      }),
    })
    assert.equal(reserved.status, 201)

    const summary = await fetch(`${context.url}/api/summary`).then((response) => response.json())
    assert.equal(summary.actualBalanceMinor, 10000000)
    assert.equal(summary.reservedCommitmentMinor, 3000000)
    assert.equal(summary.disposableBalanceMinor, 7000000)

    const planning = await fetch(`${context.url}/api/planning-cycles/2026-08`).then((response) => response.json())
    assert.equal(planning.summary.closingActualMinor, 10000000)
    assert.equal(planning.summary.reservedCommitmentMinor, 3000000)
    assert.equal(planning.summary.disposableBalanceMinor, 7000000)
  } finally {
    await new Promise((resolve) => context.server.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
})

test('rejects invalid expense commands before writing records', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-http-invalid-entry-test-'))
  const context = await startServer(directory)
  try {
    const response = await fetch(`${context.url}/api/entries`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({ type: 'expense', amountMinor: 0, occurredOn: '2026-02-30' }),
    })
    const body = await response.json()
    assert.equal(response.status, 400)
    assert.equal(body.error, 'VALIDATION_ERROR')

    const dataset = await fetch(`${context.url}/api/dataset`).then((result) => result.json())
    assert.equal(dataset.entries.length, 0)
    assert.equal(dataset.categories.length, 0)
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

test('returns readable errors for malformed JSON, disallowed origins, and unknown routes', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-http-errors-test-'))
  const context = await startServer(directory)
  try {
    const malformed = await fetch(`${context.url}/api/reconcile`, {
      method: 'POST',
      headers: clientHeaders(),
      body: '{',
    })
    const malformedBody = await malformed.json()
    assert.equal(malformed.status, 400)
    assert.equal(malformedBody.error, 'VALIDATION_ERROR')

    const disallowed = await fetch(`${context.url}/api/health`, { headers: { Origin: 'https://example.com' } })
    assert.equal(disallowed.status, 403)

    const unknown = await fetch(`${context.url}/api/not-a-route`)
    const unknownBody = await unknown.json()
    assert.equal(unknown.status, 404)
    assert.equal(unknownBody.error, 'NOT_FOUND')
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

    const preview = await fetch(`${context.url}/api/backup/validate`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify(backup),
    }).then((response) => response.json())
    assert.equal(preview.counts.entries, 2)

    await fetch(`${context.url}/api/reset`, { method: 'POST', headers: clientHeaders(), body: '{}' })
    const restored = await fetch(`${context.url}/api/backup/restore`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify(backup),
    }).then((response) => response.json())
    assert.equal(restored.summary.recoverySnapshotCreated, true)

    const dataset = await fetch(`${context.url}/api/dataset`).then((response) => response.json())
    assert.equal(dataset.entries.length, 2)
    assert.equal(dataset.planningCycles[0].cycleKey, '2026-08')
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
