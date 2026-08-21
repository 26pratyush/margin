import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TransactionForm } from './TransactionForm'

describe('TransactionForm', () => {
  it('requires valid amount, date, and expense category', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<TransactionForm defaultType="expense" onSubmit={onSubmit} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(screen.getByText(/amount greater than/i)).toBeInTheDocument()
    expect(screen.getByText(/category for this expense/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits an expense in minor units with its category', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<TransactionForm defaultType="expense" onSubmit={onSubmit} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Amount'), '1,250.50')
    await user.type(screen.getByLabelText('Category'), 'Food')
    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'expense', amountMinor: 125050, categoryName: 'Food' }),
    )
  })

  it('switches to salary mode and preserves the optional source', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<TransactionForm defaultType="expense" onSubmit={onSubmit} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Salary' }))
    await user.type(screen.getByLabelText('Amount'), '100000')
    await user.click(screen.getByRole('button', { name: 'Save salary' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'income', amountMinor: 10000000, source: 'Salary' }),
    )
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('categoryName')
  })
})
