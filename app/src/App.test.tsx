import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { latestSalary, TransactionActions } from './App'
import { todayCivilDate } from './domain/money'

describe('transaction page actions', () => {
  it('uses the latest active salary without mutating ledger order', () => {
    const entries = [
      { id: 'old', type: 'income', amountMinor: 10000000, occurredOn: '2026-07-01', status: 'active' },
      { id: 'expense', type: 'expense', amountMinor: 100, occurredOn: '2026-08-10', status: 'active' },
      { id: 'voided', type: 'income', amountMinor: 20000000, occurredOn: '2026-09-01', status: 'voided' },
      { id: 'latest', type: 'income', amountMinor: 12000000, occurredOn: '2026-08-01', status: 'active' },
    ]

    expect(latestSalary(entries)?.id).toBe('latest')
    expect(entries.map((entry) => entry.id)).toEqual(['old', 'expense', 'voided', 'latest'])
  })

  it('hides repeat salary until a salary exists and keeps add transaction available', async () => {
    const user = userEvent.setup()
    const onOpenForm = vi.fn()
    const onRepeatSalary = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(
      <TransactionActions
        latestSalaryMinor={null}
        currency="INR"
        onRepeatSalary={onRepeatSalary}
        onOpenForm={onOpenForm}
      />,
    )

    expect(screen.queryByRole('button', { name: /add salary/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add transaction' }))
    expect(onOpenForm).toHaveBeenCalledWith()

    rerender(
      <TransactionActions
        latestSalaryMinor={12000000}
        currency="INR"
        onRepeatSalary={onRepeatSalary}
        onOpenForm={onOpenForm}
      />,
    )
    await user.click(screen.getByRole('button', { name: /add salary/i }))
    expect(onRepeatSalary).toHaveBeenCalledWith({
      type: 'income',
      amountMinor: 12000000,
      occurredOn: todayCivilDate(),
      source: 'Salary',
    })
  })
})
