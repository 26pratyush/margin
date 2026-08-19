import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'

type Entry = {
  id: string
  type: string
  amountMinor: number
  occurredOn: string
  status: string
  note?: string
  source?: string
  categoryId?: string
}

type Commitment = {
  id: string
  kind: string
  name: string
  plannedAmountMinor: number
  dueOn: string
  status: string
}

type Dataset = {
  format: string
  formatVersion: number
  schemaVersion: number
  appVersion: string
  exportedAt: string
  currency: string
  entries: Entry[]
  categories: Array<{ id: string; name: string }>
  commitments: Commitment[]
  balanceSnapshots: Array<{ id: string; asOf: string; realBalanceMinor: number }>
}

type Health = {
  status: string
  storage: string
  databaseFile: string
}

const isDemoMode = new URLSearchParams(window.location.search).get('demo') === '1'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Margin-Client': 'browser',
      ...init.headers,
    },
  })

  const body = await response.json()
  if (!response.ok) throw new Error(body.message ?? 'The local Margin service rejected the request.')
  return body as T
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amountMinor / 100)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const importInput = useRef<HTMLInputElement>(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const [nextHealth, nextDataset] = await Promise.all([
        request<Health>('/api/health'),
        request<Dataset>('/api/dataset'),
      ])
      setHealth(nextHealth)
      setDataset(nextDataset)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to reach the local Margin service.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const latestEntry = dataset?.entries[0]
  const actualBalance = useMemo(
    () => dataset?.entries.reduce((total, entry) => (entry.status === 'active' ? total + (entry.type === 'income' || entry.type === 'refund' ? entry.amountMinor : -entry.amountMinor) : total), 0) ?? 0,
    [dataset],
  )

  async function seedSyntheticData() {
    setMessage(null)
    try {
      await request<Dataset>('/api/seed', { method: 'POST', body: '{}' })
      setMessage('Synthetic data seeded into the local SQLite database.')
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to seed synthetic data.')
    }
  }

  async function addSyntheticEntry() {
    const entry: Entry = { id: crypto.randomUUID(), type: 'expense', amountMinor: 75000, occurredOn: today(), status: 'active', note: 'Synthetic local entry' }
    setMessage(null)
    try {
      await request<Entry>('/api/collections/entries', { method: 'POST', body: JSON.stringify(entry) })
      setMessage('Synthetic entry created.')
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create an entry.')
    }
  }

  async function updateLatestEntry() {
    if (!latestEntry) return
    setMessage(null)
    try {
      await request<Entry>('/api/collections/entries/' + encodeURIComponent(latestEntry.id), {
        method: 'PUT',
        body: JSON.stringify({ ...latestEntry, note: 'Updated synthetic local entry' }),
      })
      setMessage('The latest entry was updated.')
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update the entry.')
    }
  }

  async function exportBackup() {
    setMessage(null)
    try {
      const backup = await request<Dataset>('/api/backup')
      const blob = new Blob([JSON.stringify(backup, null, 2) + '\n'], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'margin-backup-' + new Date().toISOString().slice(0, 10) + '.json'
      link.click()
      URL.revokeObjectURL(url)
      setMessage('Backup downloaded. Store this JSON file somewhere safe.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to export a backup.')
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setMessage(null)
    try {
      const backup = JSON.parse(await file.text()) as Dataset
      if (!window.confirm('Replace the current local dataset with this backup?')) return
      await request<Dataset>('/api/backup/restore', { method: 'POST', body: JSON.stringify(backup) })
      setMessage('Backup restored successfully.')
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to restore this backup.')
    }
  }

  async function resetData() {
    if (!window.confirm('Reset all Margin local records? Your downloaded JSON backups will not be touched.')) return
    setMessage(null)
    try {
      await request<Dataset>('/api/reset', { method: 'POST', body: '{}' })
      setMessage('Local records reset. Unrelated files were not touched.')
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to reset local data.')
    }
  }

  return (
    <main className="app-shell">
      <section className="status-card">
        <p className="eyebrow">Local-first finance tracker</p>
        <div className="heading-row">
          <div>
            <h1>Margin is running.</h1>
            <p className="intro">Your browser is the product surface. Your records live in a local SQLite file outside browser storage.</p>
          </div>
          <span className={'health-dot ' + (health ? 'online' : '')} aria-label={health ? 'Local service online' : 'Local service offline'} />
        </div>

        <dl className="runtime-details">
          <div><dt>Mode</dt><dd>{isDemoMode ? 'Synthetic demo' : 'Local data'}</dd></div>
          <div><dt>Storage</dt><dd>{health?.storage ?? 'Connecting…'}</dd></div>
          <div><dt>Database</dt><dd>{health?.databaseFile ?? 'Connecting…'}</dd></div>
          <div><dt>Origin</dt><dd>{window.location.origin}</dd></div>
        </dl>

        {loading && <p className="demo-status">Connecting to the local service…</p>}
        {error && <p className="demo-status error" role="alert">{error}</p>}
        {message && <p className="demo-status" role="status">{message}</p>}

        {dataset && (
          <>
            <div className="summary-grid">
              <div><span>Entries</span><strong>{dataset.entries.length}</strong></div>
              <div><span>Commitments</span><strong>{dataset.commitments.length}</strong></div>
              <div><span>Actual balance</span><strong>{money(actualBalance, dataset.currency)}</strong></div>
            </div>

            <div className="button-grid">
              <button type="button" onClick={() => void addSyntheticEntry()}>Add synthetic entry</button>
              <button type="button" onClick={() => void updateLatestEntry()} disabled={!latestEntry}>Update latest entry</button>
              <button type="button" onClick={() => void seedSyntheticData()}>Seed synthetic dataset</button>
              <button type="button" onClick={() => void exportBackup()}>Export JSON backup</button>
              <button type="button" onClick={() => importInput.current?.click()}>Import JSON backup</button>
              <button className="danger" type="button" onClick={() => void resetData()}>Reset local records</button>
            </div>
            <input ref={importInput} type="file" accept="application/json,.json" hidden onChange={(event) => void importBackup(event)} />

            <div className="records">
              <div className="records-heading"><h2>Recent entries</h2><button className="quiet" type="button" onClick={() => void refresh()}>Refresh</button></div>
              {dataset.entries.length === 0 && <p className="muted">No records yet. Seed synthetic data or add an entry to verify persistence.</p>}
              {dataset.entries.map((entry) => (
                <div className="record-row" key={entry.id}>
                  <div><strong>{entry.note ?? entry.source ?? entry.type}</strong><span>{entry.occurredOn} · {entry.status}</span></div>
                  <strong>{money(entry.amountMinor, dataset.currency)}</strong>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  )
}

export default App
