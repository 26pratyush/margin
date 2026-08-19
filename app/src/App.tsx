import { useEffect, useState } from 'react'

type DemoDataset = {
  format: string
  schemaVersion: number
  currency: string
  entries: unknown[]
  commitments: unknown[]
}

const isDemoMode = new URLSearchParams(window.location.search).get('demo') === '1'

function App() {
  const [demo, setDemo] = useState<DemoDataset | null>(null)
  const [demoError, setDemoError] = useState<string | null>(null)

  useEffect(() => {
    if (!isDemoMode) return

    fetch('/demo-data.json', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Synthetic demo data is not seeded yet.')
        }

        return (await response.json()) as DemoDataset
      })
      .then(setDemo)
      .catch((error: unknown) => {
        setDemoError(error instanceof Error ? error.message : 'Unable to load demo data.')
      })
  }, [])

  return (
    <main className="status-card">
      <p className="eyebrow">Local-first finance tracker</p>
      <h1>Margin is running.</h1>
      <p>
        The local browser foundation is ready. Your financial data will stay in this browser origin.
      </p>

      <dl className="runtime-details">
        <div>
          <dt>Mode</dt>
          <dd>{isDemoMode ? 'Synthetic demo' : 'Empty local app'}</dd>
        </div>
        <div>
          <dt>Origin</dt>
          <dd>{window.location.origin}</dd>
        </div>
      </dl>

      {isDemoMode && demo && (
        <p className="demo-status" role="status">
          Loaded {demo.entries.length} synthetic entries and {demo.commitments.length} synthetic commitments in {demo.currency}.
        </p>
      )}

      {isDemoMode && demoError && (
        <p className="demo-status error" role="alert">
          {demoError} Run <code>npm run demo:seed</code>, then refresh this page.
        </p>
      )}
    </main>
  )
}

export default App
