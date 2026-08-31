import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_CATEGORY_OPTIONS, TransactionForm } from './TransactionForm'

describe('TransactionForm', () => {
  it('opens with expense selected and keeps amount required while metadata stays optional', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<TransactionForm defaultType="expense" onSubmit={onSubmit} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Expense' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Salary' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(screen.getByText(/amount greater than/i)).toBeInTheDocument()
    expect(screen.queryByText(/name for this expense/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/choose or create a category/i)).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('saves an amount-only expense without sending blank metadata', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<TransactionForm defaultType="expense" onSubmit={onSubmit} onClose={vi.fn()} />)

    expect(screen.getAllByText('Optional')).toHaveLength(3)
    expect(screen.getByRole('option', { name: 'Uncategorized' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Amount'), '24')
    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ type: 'expense', amountMinor: 2400 }))
    expect(onSubmit.mock.calls[0][0]).toHaveProperty('direction', 'debit')
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('name')
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('categoryName')
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('note')
  })

  it('offers common categories before any user category has been saved', () => {
    render(<TransactionForm defaultType="expense" onSubmit={vi.fn().mockResolvedValue(undefined)} onClose={vi.fn()} />)

    for (const category of DEFAULT_CATEGORY_OPTIONS) {
      expect(screen.getByRole('option', { name: category.name })).toBeInTheDocument()
    }
    expect(screen.getByRole('option', { name: 'Create new category…' })).toBeInTheDocument()
  })

  it('does not duplicate a predefined option when it already exists in the ledger', () => {
    render(
      <TransactionForm
        defaultType="expense"
        categories={[
          { id: 'saved-food', name: ' food ' },
          { id: 'living', name: 'Living' },
        ]}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('option', { name: /food/i })).toHaveLength(1)
    expect(screen.getByRole('option', { name: 'Living' })).toBeInTheDocument()
  })

  it('submits an expense with its name, selected category, date, and note', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <TransactionForm
        defaultType="expense"
        categories={[{ id: 'food', name: 'Food' }]}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Amount'), '1,250.50')
    await user.type(screen.getByLabelText('Expense name'), 'Lunch')
    await user.selectOptions(screen.getByLabelText('Category'), 'Food')
    await user.type(screen.getByLabelText('Note'), 'Team lunch')
    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expense',
        amountMinor: 125050,
        name: 'Lunch',
        categoryName: 'Food',
        note: 'Team lunch',
      }),
    )
  })

  it('creates a new category only when the expense is saved', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<TransactionForm defaultType="expense" onSubmit={onSubmit} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Amount'), '24')
    await user.type(screen.getByLabelText('Expense name'), 'Coffee')
    await user.selectOptions(screen.getByLabelText('Category'), 'Create new category…')
    await user.type(screen.getByLabelText('New category'), 'Food')
    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Coffee', categoryName: 'Food' }))
  })

  it('allows a non-salary inbound expense credit while keeping debit as the default', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<TransactionForm defaultType="expense" onSubmit={onSubmit} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: /debit · money out/i })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: /credit · money in/i }))
    await user.type(screen.getByLabelText('Amount'), '125.50')
    await user.type(screen.getByLabelText('Note'), 'Refund from a friend')
    await user.click(screen.getByRole('button', { name: 'Save expense credit' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expense',
        direction: 'credit',
        amountMinor: 12550,
        note: 'Refund from a friend',
      }),
    )
  })

  it('switches to salary mode and clears expense-only fields', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<TransactionForm defaultType="expense" onSubmit={onSubmit} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Salary' }))
    expect(screen.queryByLabelText('Expense name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Amount'), '100000')
    await user.click(screen.getByRole('button', { name: 'Save salary' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'income', amountMinor: 10000000, source: 'Salary' }),
    )
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('categoryName')
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('name')
  })

  it('keeps focus order usable for keyboard entry', async () => {
    const user = userEvent.setup()
    render(
      <TransactionForm
        defaultType="expense"
        categories={[{ id: 'food', name: 'Food' }]}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Amount')).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('Expense name')).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('Category')).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('Date')).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('Note')).toHaveFocus()
  })

  it('shows a service error without losing entered values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('Category could not be saved.'))
    render(<TransactionForm defaultType="expense" onSubmit={onSubmit} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Amount'), '24')
    await user.type(screen.getByLabelText('Expense name'), 'Coffee')
    await user.selectOptions(screen.getByLabelText('Category'), 'Create new category…')
    await user.type(screen.getByLabelText('New category'), 'Food')
    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Category could not be saved.')
    expect(screen.getByLabelText('Expense name')).toHaveValue('Coffee')
    expect(screen.getByLabelText('New category')).toHaveValue('Food')
  })
})
