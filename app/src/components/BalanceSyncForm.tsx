import { FormEvent, useState } from 'react'
import { isValidCivilDate, parseSignedAmountToMinor, todayCivilDate } from '../domain/money'

export type BalanceSyncDraft = {
  asOf: string
  realBalanceMinor: number
  note?: string
}

export type BalanceSyncSnapshot = {
  asOf: string
  createdAt?: string
  realBalanceMinor: number
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amountMinor / 100)
}

export function BalanceSyncForm({
  actualBalanceMinor,
  currency,
  latestSnapshot,
  onSync,
  readOnly = false,
}: {
  actualBalanceMinor: number
  currency: string
  latestSnapshot?: BalanceSyncSnapshot
  onSync: (draft: BalanceSyncDraft) => Promise<void>
  readOnly?: boolean
}) {
  const [realBalance, setRealBalance] = useState('')
  const [asOf, setAsOf] = useState(todayCivilDate())
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const realBalanceMinor = parseSignedAmountToMinor(realBalance)
    if (realBalanceMinor === null) {
      setError('Enter the real balance, including 0 or a negative balance when applicable.')
      return
    }
    if (!isValidCivilDate(asOf)) {
      setError('Enter a real balance date.')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      await onSync({ asOf, realBalanceMinor, ...(note.trim() ? { note: note.trim() } : {}) })
      setRealBalance('')
      setNote('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sync the real balance.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel balance-sync-card" aria-labelledby="balance-sync-title">
      <div className="panel-heading">
        <div>
          <p className="card-label">Balance check</p>
          <h2 id="balance-sync-title">Match your real account balance.</h2>
          <p>
            Enter what your account shows. Margin records the difference as one dated credit or debit so the dashboard
            stays honest without rewriting your entries.
          </p>
        </div>
        <div className="panel-mark panel-mark-teal" aria-hidden="true">
          ↔
        </div>
      </div>
      <div className="balance-sync-current">
        <span>Calculated actual balance</span>
        <strong>{money(actualBalanceMinor, currency)}</strong>
        {latestSnapshot && (
          <small>
            Last synced {latestSnapshot.asOf} at {money(latestSnapshot.realBalanceMinor, currency)}
          </small>
        )}
      </div>
      {readOnly ? (
        <p className="balance-sync-read-only">
          Synthetic preview values are illustrative. Exit the demo to sync your real account balance.
        </p>
      ) : (
        <form className="balance-sync-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <div className="form-grid">
            <label className="field field-amount">
              <span>Real balance</span>
              <span className="field-input-wrap">
                <span className="field-prefix">₹</span>
                <input
                  autoFocus={false}
                  type="text"
                  inputMode="decimal"
                  aria-label="Real balance"
                  value={realBalance}
                  onChange={(event) => setRealBalance(event.target.value)}
                  aria-invalid={Boolean(error && parseSignedAmountToMinor(realBalance) === null)}
                  aria-describedby={error ? 'balance-sync-error' : undefined}
                  placeholder="0.00"
                />
              </span>
            </label>
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                aria-label="Balance sync date"
                value={asOf}
                onChange={(event) => setAsOf(event.target.value)}
                aria-invalid={Boolean(error && !isValidCivilDate(asOf))}
              />
            </label>
            <label className="field field-wide">
              <span>
                Note <em>Optional</em>
              </span>
              <input
                type="text"
                aria-label="Balance sync note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Checking the account after a bank transfer"
              />
            </label>
          </div>
          {error && (
            <p id="balance-sync-error" className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button type="submit" className="button button-secondary" disabled={submitting}>
              {submitting ? 'Syncing…' : 'Sync real balance'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
