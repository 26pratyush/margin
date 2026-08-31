import { FormEvent, useState } from 'react'
import { isValidCivilDate, parseAmountToMinor, todayCivilDate } from '../domain/money'

export type TransactionKind = 'income' | 'expense'
export type TransactionDirection = 'credit' | 'debit'

export type TransactionDraft = {
  type: TransactionKind
  direction?: TransactionDirection
  amountMinor: number
  occurredOn: string
  name?: string
  categoryName?: string
  source?: string
  note?: string
}

export type TransactionCategory = { id: string; name: string }

type FieldErrors = Partial<Record<'amount' | 'occurredOn' | 'form', string>>

const CREATE_CATEGORY_VALUE = '__create_category__'

export const DEFAULT_CATEGORY_OPTIONS: TransactionCategory[] = [
  { id: 'default-food', name: 'Food' },
  { id: 'default-commute', name: 'Commute' },
  { id: 'default-housing', name: 'Housing' },
  { id: 'default-bills', name: 'Bills & utilities' },
  { id: 'default-shopping', name: 'Shopping' },
  { id: 'default-health', name: 'Health' },
  { id: 'default-entertainment', name: 'Entertainment' },
  { id: 'default-education', name: 'Education' },
  { id: 'default-travel', name: 'Travel' },
  { id: 'default-personal-care', name: 'Personal care' },
  { id: 'default-subscriptions', name: 'Subscriptions' },
  { id: 'default-other', name: 'Other' },
]

function categoryOptions(categories: TransactionCategory[]) {
  const seenNames = new Set<string>()
  return [...DEFAULT_CATEGORY_OPTIONS, ...categories].filter((category) => {
    const normalizedName = category.name.trim().toLocaleLowerCase()
    if (seenNames.has(normalizedName)) return false
    seenNames.add(normalizedName)
    return true
  })
}

export function TransactionForm({
  defaultType,
  categories = [],
  onSubmit,
  onClose,
}: {
  defaultType: TransactionKind
  categories?: TransactionCategory[]
  onSubmit: (draft: TransactionDraft) => Promise<void>
  onClose: () => void
}) {
  const [type, setType] = useState<TransactionKind>(defaultType)
  const [direction, setDirection] = useState<TransactionDirection>('debit')
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayCivilDate())
  const [expenseName, setExpenseName] = useState('')
  const [categorySelection, setCategorySelection] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [source, setSource] = useState(defaultType === 'income' ? 'Salary' : '')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const availableCategories = categoryOptions(categories)

  function changeType(nextType: TransactionKind) {
    setType(nextType)
    setDirection('debit')
    setExpenseName('')
    setCategorySelection('')
    setNewCategoryName('')
    setSource(nextType === 'income' ? 'Salary' : '')
    setErrors({})
  }

  function changeCategory(value: string) {
    setCategorySelection(value)
    if (value !== CREATE_CATEGORY_VALUE) setNewCategoryName('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: FieldErrors = {}
    const amountMinor = parseAmountToMinor(amount)
    const categoryName =
      categorySelection === CREATE_CATEGORY_VALUE
        ? newCategoryName.trim()
        : (availableCategories.find((category) => category.id === categorySelection)?.name.trim() ?? '')
    if (amountMinor === null) nextErrors.amount = 'Enter an amount greater than ₹0, using up to 2 decimal places.'
    if (!isValidCivilDate(occurredOn)) nextErrors.occurredOn = 'Enter a real calendar date.'
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
        ...(type === 'expense' ? { direction } : {}),
        ...(type === 'expense' && expenseName.trim() ? { name: expenseName.trim() } : {}),
        ...(type === 'expense' && categoryName ? { categoryName } : {}),
        ...(source.trim() ? { source: source.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      setAmount('')
      setExpenseName('')
      setCategorySelection('')
      setNewCategoryName('')
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
          <p>Keep the amount and date clear. Add a name or category when the context is useful.</p>
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
          className={`kind-button ${type === 'expense' ? 'kind-button-active' : ''}`}
          aria-pressed={type === 'expense'}
          onClick={() => changeType('expense')}
        >
          Expense
        </button>
        <button
          type="button"
          className={`kind-button ${type === 'income' ? 'kind-button-active' : ''}`}
          aria-pressed={type === 'income'}
          onClick={() => changeType('income')}
        >
          Salary
        </button>
      </div>
      {type === 'expense' && (
        <div className="transaction-direction" role="group" aria-label="Expense direction">
          <span className="transaction-direction-label">Effect on balance</span>
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
        </div>
      )}
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
          {type === 'expense' && (
            <label className="field">
              <span>
                Expense name <em>Optional</em>
              </span>
              <input
                type="text"
                aria-label="Expense name"
                value={expenseName}
                onChange={(event) => setExpenseName(event.target.value)}
                placeholder="What was this for?"
              />
            </label>
          )}
          {type === 'expense' && (
            <label className="field">
              <span>
                Category <em>Optional</em>
              </span>
              <select
                aria-label="Category"
                value={categorySelection}
                onChange={(event) => changeCategory(event.target.value)}
              >
                <option value="">Uncategorized</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
                <option value={CREATE_CATEGORY_VALUE}>Create new category…</option>
              </select>
              {categorySelection === CREATE_CATEGORY_VALUE && (
                <input
                  type="text"
                  aria-label="New category"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Name your category"
                />
              )}
            </label>
          )}
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
          {type === 'income' && (
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
            {submitting
              ? 'Saving…'
              : type === 'income'
                ? 'Save salary'
                : direction === 'credit'
                  ? 'Save expense credit'
                  : 'Save expense'}
          </button>
        </div>
      </form>
    </section>
  )
}
