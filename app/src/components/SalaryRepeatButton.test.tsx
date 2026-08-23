import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { todayCivilDate } from '../domain/money'
import { buildSalaryRepeatDraft, SalaryRepeatButton } from './SalaryRepeatButton'

describe('SalaryRepeatButton', () => {
  it('builds an ordinary salary entry for the local current date', () => {
    expect(buildSalaryRepeatDraft(10000000, '2026-08-23')).toEqual({
      type: 'income',
      amountMinor: 10000000,
      occurredOn: '2026-08-23',
      source: 'Salary',
    })
  })

  it('submits once and uses today when clicked', async () => {
    const user = userEvent.setup()
    const onRepeat = vi.fn().mockResolvedValue(undefined)
    render(<SalaryRepeatButton amountMinor={10000000} amountLabel="₹1,00,000.00" onRepeat={onRepeat} />)

    await user.click(screen.getByRole('button', { name: /add salary/i }))

    expect(onRepeat).toHaveBeenCalledTimes(1)
    expect(onRepeat).toHaveBeenCalledWith({
      type: 'income',
      amountMinor: 10000000,
      occurredOn: todayCivilDate(),
      source: 'Salary',
    })
  })

  it('locks while the request is in flight so one click cannot create duplicates', async () => {
    const user = userEvent.setup()
    let resolveRequest: (() => void) | undefined
    const onRepeat = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve
        }),
    )
    render(<SalaryRepeatButton amountMinor={10000000} amountLabel="₹1,00,000.00" onRepeat={onRepeat} />)

    const button = screen.getByRole('button', { name: /add salary/i })
    await user.click(button)
    await user.click(button)

    expect(onRepeat).toHaveBeenCalledTimes(1)
    expect(button).toBeDisabled()

    resolveRequest?.()
    await screen.findByRole('button', { name: /add salary/i })
    expect(button).toBeEnabled()
  })
})
