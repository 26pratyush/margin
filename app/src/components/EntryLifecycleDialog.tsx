import { FormEvent, useEffect, useRef, useState } from 'react'
import { HistoryEntry } from '../domain/history'
import { isValidCivilDate, parseAmountToMinor } from '../domain/money'
import { TransactionCategory } from './TransactionForm'

export type EntryCorrectionPatch = {
  amountMinor: number
  occurredOn: string
  note: string | null
  name?: string | null
  categoryId?: string | null
  source?: string | null
  direction?: 'credit' | 'debit'
}

export type EntryLifecycleMode = 'correct' | 'void'

type EntryLifecycleDialogProps = {
  entry: HistoryEntry
  mode: EntryLifecycleMode
  categories: TransactionCategory[]
  currency: string
  onCorrect: (patch: EntryCorrectionPatch) => Promise<void>
  onVoid: (reason: string) => Promise<void>
  onClose: () => void
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amountMinor / 100)
}

function entryName(entry: HistoryEntry) {
  return entry.name ?? entry.source ?? entry.note ?? (entry.type === 'income' ? 'Salary' : 'Expense')
}

export function EntryLifecycleDialog({
  entry,
  mode,
  categories,
  currency,
  onCorrect,
  onVoid,
  onClose,
}: EntryLifecycleDialogProps) {
  const titleId = `entry-lifecycle-title-${entry.id}`
  const descriptionId = `entry-lifecycle-description-${entry.id}`
  const dialogRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [amount, setAmount] = useState(String(entry.amountMinor / 100))
  const [occurredOn, setOccurredOn] = useState(entry.occurredOn)
  const [direction, setDirection] = useState<'credit' | 'debit'>(entry.direction ?? 'debit')
  const [name, setName] = useState(entry.name ?? '')
  const [categoryId, setCategoryId] = useState(entry.categoryId ?? '')
  const [source, setSource] = useState(entry.source ?? '')
  const [note, setNote] = useState(entry.note ?? '')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    headingRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose()
      if (event.key !== 'Tab') return
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        ) ?? [],
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, submitting])

  async function handleCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amountMinor = parseAmountToMinor(amount)
    if (amountMinor === null) {
      setError('Enter an amount greater than ₹0, using up to 2 decimal places.')
      return
    }
    if (!isValidCivilDate(occurredOn)) {
      setError('Enter a real calendar date.')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      await onCorrect({
        amountMinor,
        occurredOn,
        note: note.trim() ? note.trim() : null,
        ...(entry.type === 'expense'
          ? {
              direction,
              name: name.trim() ? name.trim() : null,
              categoryId: categoryId || null,
            }
          : { source: source.trim() ? source.trim() : null }),
      })
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to correct this entry.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVoid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reason.trim()) {
      setError('Give the voided entry a reason so the history remains understandable.')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      await onVoid(reason.trim())
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to void this entry.')
    } finally {
      setSubmitting(false)
    }
  }

  const isCorrection = mode === 'correct'
  return (
    <div className="lifecycle-dialog-backdrop">
      <section
        className="panel lifecycle-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="panel-heading lifecycle-dialog-heading">
          <div>
            <p className="card-label">{isCorrection ? 'Correct local history' : 'Remove from active totals'}</p>
            <h2 id={titleId} ref={headingRef} tabIndex={-1}>
              {isCorrection ? 'Correct this entry.' : 'Void this entry.'}
            </h2>
            <p id={descriptionId}>
              {isCorrection
                ? `Update ${entryName(entry)} without deleting its original record.`
                : `This keeps ${entryName(entry)} recoverable while excluding it from active balances.`}
            </p>
          </div>
          <button type="button" className="notice-close" aria-label="Close entry action" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="lifecycle-entry-summary">
          <span>Current value</span>
          <strong>{money(entry.amountMinor, currency)}</strong>
          <small>
            {entry.occurredOn} · {entry.status}
          </small>
        </div>
        {isCorrection ? (
          <form className="lifecycle-form" onSubmit={(event) => void handleCorrection(event)} noValidate>
            <div className="form-grid">
              <label className="field field-amount">
                <span>Amount</span>
                <span className="field-input-wrap">
                  <span className="field-prefix">₹</span>
                  <input
                    autoFocus
                    type="text"
                    inputMode="decimal"
                    aria-label="Correction amount"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    aria-invalid={Boolean(error && parseAmountToMinor(amount) === null)}
                  />
                </span>
              </label>
              <label className="field">
                <span>Date</span>
                <input
                  type="date"
                  aria-label="Correction date"
                  value={occurredOn}
                  onChange={(event) => setOccurredOn(event.target.value)}
                  aria-invalid={Boolean(error && !isValidCivilDate(occurredOn))}
                />
              </label>
              {entry.type === 'expense' ? (
                <>
                  <label className="field">
                    <span>Expense name</span>
                    <input
                      type="text"
                      aria-label="Correction expense name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Category</span>
                    <select
                      aria-label="Correction category"
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <fieldset className="lifecycle-direction field-wide">
                    <legend>Effect on balance</legend>
                    <div className="transaction-kind transaction-direction-options">
                      <button
                        type="button"
                        className={`kind-button ${direction === 'debit' ? 'kind-button-active' : ''}`}
                        aria-pressed={direction === 'debit'}
                        onClick={() => setDirection('debit')}
                      >
                        Debit · money out
                      </button>
                      <button
                        type="button"
                        className={`kind-button ${direction === 'credit' ? 'kind-button-active' : ''}`}
                        aria-pressed={direction === 'credit'}
                        onClick={() => setDirection('credit')}
                      >
                        Credit · money in
                      </button>
                    </div>
                  </fieldset>
                </>
              ) : (
                <label className="field">
                  <span>Source</span>
                  <input
                    type="text"
                    aria-label="Correction source"
                    value={source}
                    onChange={(event) => setSource(event.target.value)}
                  />
                </label>
              )}
              <label className="field field-wide">
                <span>Note</span>
                <textarea
                  aria-label="Correction note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                />
              </label>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button type="button" className="button button-quiet" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="button button-primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save correction'}
              </button>
            </div>
          </form>
        ) : (
          <form className="lifecycle-form" onSubmit={(event) => void handleVoid(event)} noValidate>
            <p className="lifecycle-warning">
              Voiding does not erase this record. It preserves the original entry and removes its effect from active
              balance and planning calculations.
            </p>
            <label className="field">
              <span>Reason</span>
              <textarea
                autoFocus
                aria-label="Void reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                placeholder="Duplicate entry, entered on the wrong account…"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button type="button" className="button button-quiet" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="button button-danger" disabled={submitting}>
                {submitting ? 'Voiding…' : 'Void entry'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
