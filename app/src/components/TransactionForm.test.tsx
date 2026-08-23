import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TransactionForm } from './TransactionForm'

describe('TransactionForm', () => {
  it('opens with expense selected and requires amount, name, and category', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<TransactionForm defaultType="expense" onSubmit={onSubmit} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Expense' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Salary' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(screen.getByText(/amount greater than/i)).toBeInTheDocument()
    expect(screen.getByText(/name for this expense/i)).toBeInTheDocument()
    expect(screen.getByText(/choose or create a category/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
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
    await user.selectOptions(screen.getByLabelText('Category'), 'food')
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
