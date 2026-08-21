import { FormEvent, useState } from 'react'
import { isValidCivilDate, parseAmountToMinor, todayCivilDate } from '../domain/money'

export type TransactionKind = 'income' | 'expense'

export type TransactionDraft = {
  type: TransactionKind
  amountMinor: number
  occurredOn: string
  categoryName?: string
  source?: string
  note?: string
}

type FieldErrors = Partial<Record<'amount' | 'occurredOn' | 'categoryName' | 'form', string>>

export function TransactionForm({
  defaultType,
  onSubmit,
  onClose,
}: {
  defaultType: TransactionKind
  onSubmit: (draft: TransactionDraft) => Promise<void>
  onClose: () => void
}) {
  const [type, setType] = useState<TransactionKind>(defaultType)
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayCivilDate())
  const [categoryName, setCategoryName] = useState('')
  const [source, setSource] = useState(defaultType === 'income' ? 'Salary' : '')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  function changeType(nextType: TransactionKind) {
    setType(nextType)
    setSource(nextType === 'income' ? 'Salary' : '')
    setErrors({})
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: FieldErrors = {}
    const amountMinor = parseAmountToMinor(amount)
    if (amountMinor === null) nextErrors.amount = 'Enter an amount greater than ₹0, using up to 2 decimal places.'
    if (!isValidCivilDate(occurredOn)) nextErrors.occurredOn = 'Enter a real calendar date.'
    if (type === 'expense' && categoryName.trim() === '') nextErrors.categoryName = 'Add a category for this expense.'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setSubmitting(true)
    try {
      await onSubmit({
        type,
        amountMinor: amountMinor as number,
        occurredOn,
        ...(type === 'expense' ? { categoryName: categoryName.trim() } : {}),
        ...(source.trim() ? { source: source.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      setAmount('')
      setCategoryName('')
      setNote('')
    } catch (reason) {
      setErrors({ form: reason instanceof Error ? reason.message : 'Unable to save this transaction.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel transaction-composer" aria-labelledby="transaction-form-title">
      <div className="panel-heading">
        <div>
          <p className="card-label">New record</p>
          <h2 id="transaction-form-title">Add to your ledger</h2>
          <p>Keep the amount, date, and reason clear. You can add more detail later.</p>
        </div>
        <button
          type="button"
          className="notice-close composer-close"
          aria-label="Close transaction form"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="transaction-kind" role="group" aria-label="Transaction type">
        <button
          type="button"
          className={`kind-button ${type === 'income' ? 'kind-button-active' : ''}`}
          aria-pressed={type === 'income'}
          onClick={() => changeType('income')}
        >
          Salary
        </button>
        <button
          type="button"
          className={`kind-button ${type === 'expense' ? 'kind-button-active' : ''}`}
          aria-pressed={type === 'expense'}
          onClick={() => changeType('expense')}
        >
          Expense
        </button>
      </div>
      <form className="transaction-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <div className="form-grid">
          <label className="field field-amount">
            <span>Amount</span>
            <span className="field-input-wrap">
              <span className="field-prefix">₹</span>
              <input
                autoFocus
                type="text"
                inputMode="decimal"
                aria-label="Amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={errors.amount ? 'amount-error' : undefined}
                placeholder="0.00"
              />
            </span>
            {errors.amount && (
              <small id="amount-error" className="field-error">
                {errors.amount}
              </small>
            )}
          </label>
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              aria-label="Date"
              value={occurredOn}
              onChange={(event) => setOccurredOn(event.target.value)}
              aria-invalid={Boolean(errors.occurredOn)}
              aria-describedby={errors.occurredOn ? 'date-error' : undefined}
            />
            {errors.occurredOn && (
              <small id="date-error" className="field-error">
                {errors.occurredOn}
              </small>
            )}
          </label>
          {type === 'expense' ? (
            <label className="field">
              <span>Category</span>
              <input
                type="text"
                aria-label="Category"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                aria-invalid={Boolean(errors.categoryName)}
                aria-describedby={errors.categoryName ? 'category-error' : undefined}
                placeholder="Food, travel, home…"
              />
              {errors.categoryName && (
                <small id="category-error" className="field-error">
                  {errors.categoryName}
                </small>
              )}
            </label>
          ) : (
            <label className="field">
              <span>
                Source <em>Optional</em>
              </span>
              <input
                aria-label="Source"
                type="text"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="Salary"
              />
            </label>
          )}
          <label className="field field-wide">
            <span>
              Note <em>Optional</em>
            </span>
            <textarea
              aria-label="Note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="A useful detail, if you need one"
            />
          </label>
        </div>
        {errors.form && (
          <p className="form-error" role="alert">
            {errors.form}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button button-quiet" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? 'Saving…' : type === 'income' ? 'Save salary' : 'Save expense'}
          </button>
        </div>
      </form>
    </section>
  )
}
