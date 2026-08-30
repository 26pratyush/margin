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

test('projects filtered history, grouped sync events, and unchanged global summaries through the read boundary', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-http-history-test-'))
  const context = await startServer(directory)
  try {
    const invalidRange = await fetch(
      `${context.url}/api/history?period=custom&startOn=2026-08-20&endOn=2026-08-20&type=all&status=active`,
    )
    const invalidRangeBody = await invalidRange.json()
    assert.equal(invalidRange.status, 400)
    assert.equal(invalidRangeBody.error, 'VALIDATION_ERROR')

    await fetch(`${context.url}/api/entries`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({ type: 'income', amountMinor: 100000, occurredOn: '2026-08-01', source: 'Salary' }),
    })
    const original = await fetch(`${context.url}/api/entries`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({
        type: 'expense',
        amountMinor: 1000,
        occurredOn: '2026-08-02',
        name: 'Original lunch',
        categoryName: 'Food',
      }),
    }).then((response) => response.json())
    await fetch(`${context.url}/api/entries/${original.entry.id}/correct`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({
        operationId: 'history-correction-1',
        expectedUpdatedAt: original.entry.updatedAt,
        patch: { amountMinor: 800 },
      }),
    })

    const before = await fetch(`${context.url}/api/summary`).then((response) => response.json())
    const activeHistory = await fetch(
      `${context.url}/api/history?period=custom&startOn=2026-08-01&endOn=2026-08-03&type=all&status=active`,
    ).then((response) => response.json())
    assert.equal(activeHistory.items.length, 2)
    assert.equal(activeHistory.summary.activeCount, 2)
    assert.equal(activeHistory.summary.voidedCount, 0)
    assert.equal(activeHistory.summary.creditsMinor, 100000)
    assert.equal(activeHistory.summary.debitsMinor, 800)

    const allHistory = await fetch(
      `${context.url}/api/history?period=custom&startOn=2026-08-02&endOn=2026-08-03&type=expense&status=all`,
    ).then((response) => response.json())
    assert.equal(allHistory.items.length, 2)
    assert.equal(allHistory.summary.activeCount, 1)
    assert.equal(allHistory.summary.voidedCount, 1)
    assert.equal(allHistory.summary.debitsMinor, 800)

    const reconciliation = await fetch(`${context.url}/api/reconcile`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({ asOf: '2026-08-02', realBalanceMinor: 98000, note: 'Synthetic sync' }),
    }).then((response) => response.json())
    assert.equal(reconciliation.adjustment.direction, 'debit')
    assert.equal(reconciliation.adjustment.amountMinor, 1200)

    const syncHistory = await fetch(
      `${context.url}/api/history?period=custom&startOn=2026-08-02&endOn=2026-08-03&type=balance-sync&status=active`,
    ).then((response) => response.json())
    assert.equal(syncHistory.items.length, 1)
    assert.equal(syncHistory.items[0].kind, 'balance-sync')
    assert.equal(syncHistory.summary.debitsMinor, 1200)

    const allWithSync = await fetch(
      `${context.url}/api/history?period=custom&startOn=2026-08-02&endOn=2026-08-03&type=all&status=active`,
    ).then((response) => response.json())
    assert.equal(allWithSync.items.filter((item) => item.kind === 'balance-sync').length, 1)
    assert.equal(allWithSync.items.filter((item) => item.kind === 'entry').length, 1)

    await fetch(`${context.url}/api/reconcile`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({ asOf: '2026-08-03', realBalanceMinor: 98000 }),
    })
    const zeroSync = await fetch(
      `${context.url}/api/history?period=custom&startOn=2026-08-03&endOn=2026-08-04&type=balance-sync&status=active`,
    ).then((response) => response.json())
    assert.equal(zeroSync.items.length, 1)
    assert.equal(zeroSync.items[0].adjustment, undefined)
    assert.equal(zeroSync.summary.netMovementMinor, 0)

    const after = await fetch(`${context.url}/api/summary`).then((response) => response.json())
    assert.deepEqual(after, {
      ...before,
      actualBalanceMinor: 98000,
      disposableBalanceMinor: 98000,
      entryCount: before.entryCount + 1,
      activeEntryCount: before.activeEntryCount + 1,
    })
  } finally {
    await new Promise((resolve) => context.server.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
})

test('exposes dedicated correction and void commands without generic entry mutation', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-http-correction-test-'))
  const context = await startServer(directory)
  try {
    const created = await fetch(`${context.url}/api/entries`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({
        type: 'expense',
        amountMinor: 100000,
        occurredOn: '2026-08-20',
        name: 'Lunch',
        categoryName: 'Food',
      }),
    }).then((response) => response.json())

    const correctedResponse = await fetch(`${context.url}/api/entries/${created.entry.id}/correct`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({
        operationId: 'http-correction-1',
        expectedUpdatedAt: created.entry.updatedAt,
        patch: { amountMinor: 80000, note: 'Corrected' },
      }),
    })
    const corrected = await correctedResponse.json()
    assert.equal(correctedResponse.status, 200)
    assert.equal(corrected.original.status, 'voided')
    assert.equal(corrected.replacement.amountMinor, 80000)
    assert.equal(corrected.summary.expenseMinor, 80000)

    const genericUpdate = await fetch(`${context.url}/api/collections/entries/${created.entry.id}`, {
      method: 'PUT',
      headers: clientHeaders(),
      body: JSON.stringify(corrected.original),
    })
    const genericBody = await genericUpdate.json()
    assert.equal(genericUpdate.status, 409)
    assert.equal(genericBody.error, 'ENTRY_MUTATION_REQUIRES_COMMAND')

    const voidedResponse = await fetch(`${context.url}/api/entries/${corrected.replacement.id}/void`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({
        operationId: 'http-void-1',
        expectedUpdatedAt: corrected.replacement.updatedAt,
        reason: 'Remove synthetic test entry',
      }),
    })
    const voided = await voidedResponse.json()
    assert.equal(voidedResponse.status, 200)
    assert.equal(voided.entry.status, 'voided')
    assert.equal(voided.summary.actualBalanceMinor, 0)
  } finally {
    await new Promise((resolve) => context.server.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
})

test('returns deterministic command errors for missing, invalid, stale, and repeated requests', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'margin-http-correction-errors-test-'))
  const context = await startServer(directory)
  try {
    const missing = await fetch(`${context.url}/api/entries/missing/correct`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({
        operationId: 'missing-1',
        expectedUpdatedAt: '2026-08-20T10:00:00.000Z',
        patch: { amountMinor: 10 },
      }),
    })
    assert.equal(missing.status, 404)
    assert.equal((await missing.json()).error, 'NOT_FOUND')

    const created = await fetch(`${context.url}/api/entries`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({ type: 'income', amountMinor: 100, occurredOn: '2026-08-20' }),
    }).then((response) => response.json())
    const invalid = await fetch(`${context.url}/api/entries/${created.entry.id}/correct`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({
        operationId: 'invalid-1',
        expectedUpdatedAt: created.entry.updatedAt,
        patch: { amountMinor: 0 },
      }),
    })
    assert.equal(invalid.status, 400)
    assert.equal((await invalid.json()).error, 'VALIDATION_ERROR')

    const stale = await fetch(`${context.url}/api/entries/${created.entry.id}/correct`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({
        operationId: 'stale-1',
        expectedUpdatedAt: '2026-08-19T10:00:00.000Z',
        patch: { amountMinor: 90 },
      }),
    })
    assert.equal(stale.status, 409)
    assert.equal((await stale.json()).error, 'STALE_ENTRY')

    const corrected = await fetch(`${context.url}/api/entries/${created.entry.id}/correct`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({
        operationId: 'repeat-1',
        expectedUpdatedAt: created.entry.updatedAt,
        patch: { amountMinor: 90 },
      }),
    }).then((response) => response.json())
    const repeated = await fetch(`${context.url}/api/entries/${created.entry.id}/correct`, {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({
        operationId: 'repeat-1',
        expectedUpdatedAt: created.entry.updatedAt,
        patch: { amountMinor: 90 },
      }),
    }).then((response) => response.json())
    assert.equal(repeated.replacement.id, corrected.replacement.id)
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
