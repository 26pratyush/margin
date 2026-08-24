import { FormEvent, ReactNode, useState } from 'react'
import { isValidCivilDate, parseAmountToMinor } from '../domain/money'

export type PlanningCycle = {
  id: string
  cycleKey: string
  startOn: string
  endOn: string
  expectedSalaryMinor?: number
  expectedSalaryOn?: string
  createdAt: string
  updatedAt: string
}

export type PlanningSummary = {
  openingActualMinor: number
  rolloverMinor: number
  expectedSalaryMinor: number | null
  actualSalaryMinor: number
  salaryVarianceMinor: number | null
  salaryStatus: 'unplanned' | 'expected' | 'missing' | 'partial' | 'received'
  periodCreditsMinor: number
  periodDebitsMinor: number
  closingActualMinor: number
  reservedCommitmentMinor: number
  disposableBalanceMinor: number
}

export type PlanningResponse = {
  cycle: PlanningCycle | null
  summary: PlanningSummary
}

export type ReserveDraft = {
  name: string
  amountMinor: number
  dueOn: string
}

type PlanningWorkspaceProps = {
  planning: PlanningResponse | null
  cycleKey: string
  currency: string
  actualBalanceMinor: number
  hasLedgerData: boolean
  loading: boolean
  error: string | null
  onSaveSalary: (input: { expectedSalaryMinor: number; expectedSalaryOn?: string }) => Promise<void>
  onReserve: (draft: ReserveDraft) => Promise<void>
  onRetry: () => void
}

function PlanningHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  )
}

function PlanningErrorState({ description, onRetry }: { description: string; onRetry: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">
        ⌁
      </div>
      <p className="eyebrow">Planning unavailable</p>
      <h2>This cycle could not be opened.</h2>
      <p>{description}</p>
      <div className="empty-actions">
        <button type="button" className="button button-primary" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  )
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amountMinor / 100)
}

function cycleLabel(cycleKey: string) {
  const [year, month] = cycleKey.split('-').map(Number)
  if (!year || !month) return cycleKey
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${value}T00:00:00.000Z`),
  )
}

function statusLabel(status: PlanningSummary['salaryStatus']) {
  return {
    unplanned: 'Not planned yet',
    expected: 'Expected this cycle',
    missing: 'Expected, not recorded',
    partial: 'Partially received',
    received: 'Received',
  }[status]
}

function statusTone(status: PlanningSummary['salaryStatus']) {
  if (status === 'received') return 'planning-status-positive'
  if (status === 'missing') return 'planning-status-negative'
  if (status === 'partial') return 'planning-status-warning'
  return 'planning-status-neutral'
}

function signedMoney(amountMinor: number, currency: string) {
  return `${amountMinor < 0 ? '−' : ''}${money(Math.abs(amountMinor), currency)}`
}

function LockerGlyph({ open }: { open: boolean }) {
  return (
    <div className={`locker-glyph ${open ? 'locker-glyph-open' : ''}`} aria-hidden="true">
      <div className="locker-glow" />
      <div className="locker-body">
        <div className="locker-door">
          <span className="locker-bolt locker-bolt-top" />
          <span className="locker-bolt locker-bolt-right" />
          <span className="locker-bolt locker-bolt-bottom" />
          <span className="locker-bolt locker-bolt-left" />
          <span className="locker-wheel locker-wheel-outer" />
          <span className="locker-wheel locker-wheel-inner" />
          <span className="locker-handle" />
        </div>
      </div>
      <span className="locker-shadow" />
    </div>
  )
}

function LockerCard({
  reservedAmountMinor,
  currency,
  cycle,
  onReserve,
}: {
  reservedAmountMinor: number
  currency: string
  cycle: PlanningCycle
  onReserve: (draft: ReserveDraft) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [showReserve, setShowReserve] = useState(false)
  const [amount, setAmount] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function toggleOpen() {
    setOpen((current) => !current)
    setError(null)
  }

  async function handleReserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amountMinor = parseAmountToMinor(amount)
    const nextError =
      amountMinor === null
        ? 'Enter an amount greater than ₹0, using up to 2 decimal places.'
        : name.trim() === ''
          ? 'Give this reserve a clear purpose.'
          : null
    if (nextError) {
      setError(nextError)
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      await onReserve({ name: name.trim(), amountMinor: amountMinor as number, dueOn: cycle.startOn })
      setAmount('')
      setName('')
      setShowReserve(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to reserve this amount.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={`panel locker-card ${open ? 'locker-card-open' : ''}`} aria-labelledby="locker-title">
      <div className="locker-card-heading">
        <div>
          <p className="card-label">A quiet place for future you</p>
          <h2 id="locker-title">The monthly locker</h2>
          <p className="locker-intro">Keep a plan visible without pretending the money has left your account.</p>
        </div>
        <span className="locker-spark" aria-hidden="true">
          ✦
        </span>
      </div>
      <div className="locker-stage">
        <LockerGlyph open={open} />
        <div className="locker-amount" aria-live="polite">
          <span>{open ? 'Reserved this cycle' : 'Reserved amount'}</span>
          <strong>{open ? money(reservedAmountMinor, currency) : '₹ ••••••'}</strong>
          <small>{open ? 'Planned commitments, not spent' : 'Open the locker to take a look'}</small>
        </div>
      </div>
      <div className="locker-actions">
        <button
          type="button"
          className="button button-secondary locker-open-button"
          aria-expanded={open}
          aria-controls="locker-details"
          onClick={toggleOpen}
        >
          {open ? 'Close locker' : 'Open locker'}
          <span className="locker-key" aria-hidden="true">
            ↗
          </span>
        </button>
      </div>
      <div id="locker-details" className="locker-details" hidden={!open}>
        <div className="locker-divider" />
        <div className="locker-detail-copy">
          <div>
            <strong>Reserved is not spent</strong>
            <p>This plan leaves actual balance unchanged and lowers your disposable amount only.</p>
          </div>
          <span className="locker-check" aria-hidden="true">
            ✓
          </span>
        </div>
        {!showReserve ? (
          <button type="button" className="button button-primary" onClick={() => setShowReserve(true)}>
            Reserve money for {cycleLabel(cycle.cycleKey)}
          </button>
        ) : (
          <form className="locker-reserve-form" onSubmit={(event) => void handleReserve(event)} noValidate>
            <div className="locker-form-heading">
              <div>
                <strong>Make a plan for this cycle</strong>
                <span>It will be due on {dateLabel(cycle.startOn)}.</span>
              </div>
              <button
                type="button"
                className="notice-close locker-form-close"
                aria-label="Close reserve form"
                onClick={() => {
                  setShowReserve(false)
                  setError(null)
                }}
              >
                ×
              </button>
            </div>
            <label className="field">
              <span>Reserve amount</span>
              <span className="field-input-wrap">
                <span className="field-prefix">₹</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  aria-label="Reserve amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  aria-invalid={Boolean(error && !parseAmountToMinor(amount))}
                  placeholder="0.00"
                />
              </span>
            </label>
            <label className="field">
              <span>Purpose</span>
              <input
                type="text"
                aria-label="Reserve purpose"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={Boolean(error && name.trim() === '')}
                placeholder="Emergency fund, annual fee…"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button type="button" className="button button-quiet" onClick={() => setShowReserve(false)}>
                Cancel
              </button>
              <button type="submit" className="button button-primary" disabled={submitting}>
                {submitting ? 'Saving plan…' : 'Save planned reserve'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

function SalaryPlanCard({
  planning,
  currency,
  onSave,
}: {
  planning: PlanningResponse
  currency: string
  onSave: (input: { expectedSalaryMinor: number; expectedSalaryOn?: string }) => Promise<void>
}) {
  const [amount, setAmount] = useState(
    planning.summary.expectedSalaryMinor === null ? '' : String(planning.summary.expectedSalaryMinor / 100),
  )
  const [expectedOn, setExpectedOn] = useState(planning.cycle?.expectedSalaryOn ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amountMinor = parseAmountToMinor(amount)
    if (amountMinor === null) {
      setError('Enter an expected salary greater than ₹0, using up to 2 decimal places.')
      return
    }
    if (expectedOn && !isValidCivilDate(expectedOn)) {
      setError('Enter a real expected salary date.')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      await onSave({ expectedSalaryMinor: amountMinor, ...(expectedOn ? { expectedSalaryOn: expectedOn } : {}) })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save expected salary.')
    } finally {
      setSubmitting(false)
    }
  }

  const summary = planning.summary
  return (
    <section className="panel salary-plan-card" aria-labelledby="salary-plan-title">
      <div className="panel-heading">
        <div>
          <p className="card-label">Salary signal</p>
          <h2 id="salary-plan-title">What is arriving?</h2>
          <p>Expected money stays separate until it becomes a real ledger entry.</p>
        </div>
        <span className={`planning-status ${statusTone(summary.salaryStatus)}`}>
          {statusLabel(summary.salaryStatus)}
        </span>
      </div>
      <div className="salary-plan-values">
        <div>
          <span>Expected</span>
          <strong>{summary.expectedSalaryMinor === null ? '—' : money(summary.expectedSalaryMinor, currency)}</strong>
        </div>
        <div>
          <span>Actual</span>
          <strong>{money(summary.actualSalaryMinor, currency)}</strong>
        </div>
      </div>
      <form className="salary-plan-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <div className="form-grid">
          <label className="field">
            <span>Expected salary</span>
            <span className="field-input-wrap">
              <span className="field-prefix">₹</span>
              <input
                type="text"
                inputMode="decimal"
                aria-label="Expected salary"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={Boolean(error && !parseAmountToMinor(amount))}
                placeholder="0.00"
              />
            </span>
          </label>
          <label className="field">
            <span>
              Expected on <em>optional</em>
            </span>
            <input
              type="date"
              aria-label="Expected salary date"
              value={expectedOn}
              onChange={(event) => setExpectedOn(event.target.value)}
              aria-invalid={Boolean(error && expectedOn !== '' && !isValidCivilDate(expectedOn))}
            />
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" className="button button-secondary" disabled={submitting}>
            {submitting
              ? 'Saving…'
              : summary.expectedSalaryMinor === null
                ? 'Set expected salary'
                : 'Update expectation'}
          </button>
        </div>
      </form>
    </section>
  )
}

export function PlanningWorkspace({
  planning,
  cycleKey,
  currency,
  actualBalanceMinor,
  hasLedgerData,
  loading,
  error,
  onSaveSalary,
  onReserve,
  onRetry,
}: PlanningWorkspaceProps) {
  if (loading && !planning) {
    return (
      <>
        <PlanningHeading
          eyebrow="Workspace / Planning"
          title="Planning"
          description="One calm view of what is held, arriving, spent, and still yours to decide."
        />
        <section className="panel loading-panel" aria-label="Loading planning workspace">
          <span className="status-dot status-dot-teal" />
          Opening this month’s planning workspace…
        </section>
      </>
    )
  }

  if (error && !planning) {
    return (
      <>
        <PlanningHeading
          eyebrow="Workspace / Planning"
          title="Planning"
          description="One calm view of what is held, arriving, spent, and still yours to decide."
        />
        <section className="panel">
          <PlanningErrorState description={error} onRetry={onRetry} />
        </section>
      </>
    )
  }

  if (!planning) return null

  const { summary } = planning
  const cycle = planning.cycle ?? {
    id: cycleKey,
    cycleKey,
    startOn: `${cycleKey}-01`,
    endOn: `${cycleKey}-01`,
    createdAt: '',
    updatedAt: '',
  }
  const isEmptyCycle =
    !hasLedgerData &&
    summary.openingActualMinor === 0 &&
    summary.actualSalaryMinor === 0 &&
    summary.expectedSalaryMinor === null &&
    summary.reservedCommitmentMinor === 0
  return (
    <>
      <PlanningHeading
        eyebrow="Workspace / Planning"
        title="Your month, with margin."
        description="Understand what is already held, what may arrive, what has been spent, and what you can safely plan."
        action={
          <span className="cycle-badge">
            <span className="status-dot status-dot-teal" />
            {cycleLabel(cycleKey)}
          </span>
        }
      />
      {error && (
        <div className="notice notice-error" role="alert">
          <span>{error}</span>
        </div>
      )}
      {isEmptyCycle && (
        <section className="planning-empty-note" aria-label="Empty planning cycle">
          <span className="planning-empty-mark" aria-hidden="true">
            ✦
          </span>
          <div>
            <strong>A fresh month starts here.</strong>
            <p>
              Nothing is recorded yet. Set an expected salary below or open the locker when you are ready to make a
              plan.
            </p>
          </div>
        </section>
      )}
      <section className="planning-state-strip" aria-label="Planning cycle summary">
        <div className="planning-state">
          <span className="planning-state-icon planning-state-icon-held">◒</span>
          <span>Held at start</span>
          <strong>{signedMoney(summary.openingActualMinor, currency)}</strong>
          <small>Rollover from before this month</small>
        </div>
        <div className="planning-state">
          <span className="planning-state-icon planning-state-icon-salary">↗</span>
          <span>Actual salary</span>
          <strong>{money(summary.actualSalaryMinor, currency)}</strong>
          <small>
            {summary.expectedSalaryMinor === null ? 'No expectation set' : statusLabel(summary.salaryStatus)}
          </small>
        </div>
        <div className="planning-state">
          <span className="planning-state-icon planning-state-icon-spent">−</span>
          <span>Spent this month</span>
          <strong>{money(summary.periodDebitsMinor, currency)}</strong>
          <small>Actual debits only</small>
        </div>
        <div className="planning-state planning-state-accent">
          <span className="planning-state-icon planning-state-icon-reserved">⌁</span>
          <span>Reserved</span>
          <strong>{money(summary.reservedCommitmentMinor, currency)}</strong>
          <small>Plans, not cash movements</small>
        </div>
        <div
          className={`planning-state planning-state-disposable ${summary.disposableBalanceMinor < 0 ? 'planning-state-negative' : ''}`}
        >
          <span className="planning-state-icon planning-state-icon-disposable">✓</span>
          <span>Disposable</span>
          <strong>{signedMoney(summary.disposableBalanceMinor, currency)}</strong>
          <small>
            {summary.disposableBalanceMinor < 0
              ? 'Below zero: commitments exceed closing balance'
              : 'Available after planned commitments'}
          </small>
        </div>
      </section>
      <div className="planning-grid">
        <LockerCard
          reservedAmountMinor={summary.reservedCommitmentMinor}
          currency={currency}
          cycle={cycle}
          onReserve={onReserve}
        />
        <SalaryPlanCard planning={planning} currency={currency} onSave={onSaveSalary} />
      </div>
      <section className="panel planning-ledger-card" aria-labelledby="planning-ledger-title">
        <div className="panel-heading">
          <div>
            <p className="card-label">The honest close</p>
            <h2 id="planning-ledger-title">Where this cycle lands</h2>
            <p>Disposable is calculated after planned commitments, never before.</p>
          </div>
          <span className="planning-close-value">{signedMoney(summary.closingActualMinor, currency)}</span>
        </div>
        <div className="planning-ledger-line">
          <div>
            <span>Held at start</span>
            <strong>{signedMoney(summary.openingActualMinor, currency)}</strong>
          </div>
          <span className="planning-operator">+</span>
          <div>
            <span>Credits</span>
            <strong>{money(summary.periodCreditsMinor, currency)}</strong>
          </div>
          <span className="planning-operator">−</span>
          <div>
            <span>Spent</span>
            <strong>{money(summary.periodDebitsMinor, currency)}</strong>
          </div>
          <span className="planning-operator">=</span>
          <div className="planning-ledger-total">
            <span>Closing actual</span>
            <strong>{signedMoney(summary.closingActualMinor, currency)}</strong>
          </div>
        </div>
        <p className="planning-footnote">
          <span className="status-dot status-dot-teal" />
          The locker is a visual reminder for a plan. Your overall actual balance stays{' '}
          {signedMoney(actualBalanceMinor, currency)} until a real transaction is recorded.
        </p>
      </section>
    </>
  )
}
