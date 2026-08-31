import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BalanceSyncForm } from './BalanceSyncForm'
import { todayCivilDate } from '../domain/money'

function renderForm(onSync = vi.fn().mockResolvedValue(undefined)) {
  render(
    <BalanceSyncForm
      actualBalanceMinor={100000}
      currency="INR"
      latestSnapshot={{ asOf: '2026-08-30', realBalanceMinor: 90000 }}
      onSync={onSync}
    />,
  )
  return onSync
}

describe('BalanceSyncForm', () => {
  it('shows the calculated balance and submits a signed real balance', async () => {
    const user = userEvent.setup()
    const onSync = renderForm()

    expect(screen.getByText('₹1,000.00')).toBeInTheDocument()
    expect(screen.getByText(/Last synced 2026-08-30/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Real balance'), '-125.50')
    await user.type(screen.getByLabelText('Balance sync note'), 'Account check')
    await user.click(screen.getByRole('button', { name: 'Sync real balance' }))

    await waitFor(() =>
      expect(onSync).toHaveBeenCalledWith({
        asOf: todayCivilDate(),
        realBalanceMinor: -12550,
        note: 'Account check',
      }),
    )
    expect(screen.getByLabelText('Real balance')).toHaveValue('')
  })

  it('accepts zero and rejects invalid balances before the persistence boundary', async () => {
    const user = userEvent.setup()
    const onSync = renderForm()
    await user.click(screen.getByRole('button', { name: 'Sync real balance' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/enter the real balance/i)
    expect(onSync).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Real balance'), '0')
    await user.click(screen.getByRole('button', { name: 'Sync real balance' }))
    await waitFor(() => expect(onSync).toHaveBeenCalledWith({ asOf: todayCivilDate(), realBalanceMinor: 0 }))
  })

  it('keeps entered values when the service rejects a sync', async () => {
    const user = userEvent.setup()
    renderForm(vi.fn().mockRejectedValue(new Error('Local service unavailable.')))
    await user.type(screen.getByLabelText('Real balance'), '1250')
    await user.click(screen.getByRole('button', { name: 'Sync real balance' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Local service unavailable.')
    expect(screen.getByLabelText('Real balance')).toHaveValue('1250')
  })
})
