import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HistoryEntry } from '../domain/history'
import { EntryLifecycleDialog } from './EntryLifecycleDialog'

function expense(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'expense-1',
    type: 'expense',
    amountMinor: 125050,
    occurredOn: '2026-08-03',
    status: 'active',
    createdAt: '2026-08-03T10:00:00.000Z',
    updatedAt: '2026-08-03T10:00:00.000Z',
    name: 'Lunch',
    categoryId: 'food',
    direction: 'debit',
    note: 'Team lunch',
    ...overrides,
  }
}

describe('EntryLifecycleDialog', () => {
  it('submits a complete expense correction with the editable fields', async () => {
    const user = userEvent.setup()
    const onCorrect = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(
      <EntryLifecycleDialog
        entry={expense()}
        mode="correct"
        categories={[
          { id: 'food', name: 'Food' },
          { id: 'travel', name: 'Travel' },
        ]}
        currency="INR"
        onCorrect={onCorrect}
        onVoid={vi.fn().mockResolvedValue(undefined)}
        onClose={onClose}
      />,
    )

    await user.clear(screen.getByLabelText('Correction amount'))
    await user.type(screen.getByLabelText('Correction amount'), '800')
    await user.clear(screen.getByLabelText('Correction date'))
    await user.type(screen.getByLabelText('Correction date'), '2026-08-04')
    await user.clear(screen.getByLabelText('Correction expense name'))
    await user.type(screen.getByLabelText('Correction expense name'), 'Corrected lunch')
    await user.selectOptions(screen.getByLabelText('Correction category'), 'travel')
    await user.click(screen.getByRole('button', { name: /credit · money in/i }))
    await user.clear(screen.getByLabelText('Correction note'))
    await user.type(screen.getByLabelText('Correction note'), 'Refunded by merchant')
    await user.click(screen.getByRole('button', { name: 'Save correction' }))

    await waitFor(() => expect(onCorrect).toHaveBeenCalledTimes(1))
    expect(onCorrect).toHaveBeenCalledWith({
      amountMinor: 80000,
      occurredOn: '2026-08-04',
      note: 'Refunded by merchant',
      direction: 'credit',
      name: 'Corrected lunch',
      categoryId: 'travel',
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('blocks invalid correction input without calling the service callback', async () => {
    const user = userEvent.setup()
    const onCorrect = vi.fn().mockResolvedValue(undefined)
    render(
      <EntryLifecycleDialog
        entry={expense()}
        mode="correct"
        categories={[]}
        currency="INR"
        onCorrect={onCorrect}
        onVoid={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    )

    await user.clear(screen.getByLabelText('Correction amount'))
    await user.click(screen.getByRole('button', { name: 'Save correction' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/amount greater than/i)
    expect(onCorrect).not.toHaveBeenCalled()
  })

  it('keeps keyboard focus inside the modal dialog', async () => {
    const user = userEvent.setup()
    render(
      <EntryLifecycleDialog
        entry={expense()}
        mode="correct"
        categories={[]}
        currency="INR"
        onCorrect={vi.fn().mockResolvedValue(undefined)}
        onVoid={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    )

    const close = screen.getByRole('button', { name: 'Close entry action' })
    const save = screen.getByRole('button', { name: 'Save correction' })
    save.focus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(save).toHaveFocus()
  })

  it('requires a reason before voiding and submits the trimmed reason', async () => {
    const user = userEvent.setup()
    const onVoid = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(
      <EntryLifecycleDialog
        entry={expense()}
        mode="void"
        categories={[]}
        currency="INR"
        onCorrect={vi.fn().mockResolvedValue(undefined)}
        onVoid={onVoid}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Void entry' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/give the voided entry a reason/i)
    expect(onVoid).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Void reason'), '  Duplicate entry  ')
    await user.click(screen.getByRole('button', { name: 'Void entry' }))
    await waitFor(() => expect(onVoid).toHaveBeenCalledWith('Duplicate entry'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps the dialog open and preserves values when the service rejects a correction', async () => {
    const user = userEvent.setup()
    const onCorrect = vi.fn().mockRejectedValue(new Error('Entry changed elsewhere. Refresh and try again.'))
    render(
      <EntryLifecycleDialog
        entry={expense()}
        mode="correct"
        categories={[]}
        currency="INR"
        onCorrect={onCorrect}
        onVoid={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    )

    await user.clear(screen.getByLabelText('Correction expense name'))
    await user.type(screen.getByLabelText('Correction expense name'), 'Still lunch')
    await user.click(screen.getByRole('button', { name: 'Save correction' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/changed elsewhere/i)
    expect(screen.getByLabelText('Correction expense name')).toHaveValue('Still lunch')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('uses the income source field and closes on Escape', async () => {
    const user = userEvent.setup()
    const onCorrect = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    const { unmount } = render(
      <EntryLifecycleDialog
        entry={expense({ type: 'income', source: 'Salary', name: undefined, categoryId: undefined })}
        mode="correct"
        categories={[]}
        currency="INR"
        onCorrect={onCorrect}
        onVoid={vi.fn().mockResolvedValue(undefined)}
        onClose={onClose}
      />,
    )

    expect(screen.getByLabelText('Correction source')).toHaveValue('Salary')
    expect(screen.queryByLabelText('Correction expense name')).not.toBeInTheDocument()
    await user.clear(screen.getByLabelText('Correction source'))
    await user.type(screen.getByLabelText('Correction source'), 'Payroll')
    await user.click(screen.getByRole('button', { name: 'Save correction' }))

    await waitFor(() =>
      expect(onCorrect).toHaveBeenCalledWith({
        amountMinor: 125050,
        occurredOn: '2026-08-03',
        note: 'Team lunch',
        source: 'Payroll',
      }),
    )

    onClose.mockClear()
    unmount()
    render(
      <EntryLifecycleDialog
        entry={expense()}
        mode="void"
        categories={[]}
        currency="INR"
        onCorrect={vi.fn().mockResolvedValue(undefined)}
        onVoid={vi.fn().mockResolvedValue(undefined)}
        onClose={onClose}
      />,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
