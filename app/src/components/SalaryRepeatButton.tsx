import { useRef, useState } from 'react'
import { todayCivilDate } from '../domain/money'

export type SalaryRepeatDraft = {
  type: 'income'
  amountMinor: number
  occurredOn: string
  source: 'Salary'
}

export function buildSalaryRepeatDraft(amountMinor: number, occurredOn = todayCivilDate()): SalaryRepeatDraft {
  return { type: 'income', amountMinor, occurredOn, source: 'Salary' }
}

export function SalaryRepeatButton({
  amountMinor,
  amountLabel,
  onRepeat,
}: {
  amountMinor: number
  amountLabel: string
  onRepeat: (draft: SalaryRepeatDraft) => Promise<void>
}) {
  const [submitting, setSubmitting] = useState(false)
  const inFlight = useRef(false)

  async function handleClick() {
    if (inFlight.current) return
    inFlight.current = true
    setSubmitting(true)
    try {
      await onRepeat(buildSalaryRepeatDraft(amountMinor))
    } catch {
      // The parent owns the user-facing error notice. Always unlock this action.
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <button
      type="button"
      className="salary-repeat-button"
      onClick={() => void handleClick()}
      disabled={submitting}
      aria-busy={submitting}
    >
      <span>{submitting ? 'Adding salary…' : 'Add salary'}</span>
      <small>{amountLabel} · today</small>
    </button>
  )
}
