import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PlanningResponse, PlanningWorkspace } from './PlanningWorkspace'

const planning: PlanningResponse = {
  cycle: {
    id: '2026-08',
    cycleKey: '2026-08',
    startOn: '2026-08-01',
    endOn: '2026-09-01',
    expectedSalaryMinor: 6500000,
    expectedSalaryOn: '2026-08-01',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  },
  summary: {
    openingActualMinor: 10000000,
    rolloverMinor: 10000000,
    expectedSalaryMinor: 6500000,
    actualSalaryMinor: 6500000,
    salaryVarianceMinor: 0,
    salaryStatus: 'received',
    periodCreditsMinor: 6500000,
    periodDebitsMinor: 2750000,
    closingActualMinor: 13750000,
    reservedCommitmentMinor: 3000000,
    disposableBalanceMinor: 10750000,
  },
}

function renderWorkspace(overrides: Partial<ComponentProps<typeof PlanningWorkspace>> = {}) {
  return render(
    <PlanningWorkspace
      planning={planning}
      cycleKey="2026-08"
      currency="INR"
      actualBalanceMinor={13750000}
      hasLedgerData
      loading={false}
      error={null}
      onSaveSalary={vi.fn().mockResolvedValue(undefined)}
      onReserve={vi.fn().mockResolvedValue(undefined)}
      onRetry={vi.fn()}
      {...overrides}
    />,
  )
}

describe('PlanningWorkspace', () => {
  it('keeps the locker amount hidden until opened and records a planned reserve', async () => {
    const user = userEvent.setup()
    const onReserve = vi.fn().mockResolvedValue(undefined)
    renderWorkspace({ onReserve })

    expect(screen.getByText('₹ ••••••')).toBeInTheDocument()
    expect(screen.queryByText('₹10,000.00')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open locker' }))
    const locker = screen.getByRole('region', { name: 'The monthly locker' })
    expect(within(locker).getByText('Reserved this cycle')).toBeInTheDocument()
    expect(within(locker).getByText('₹30,000.00')).toBeInTheDocument()
    expect(within(locker).queryByText('₹1,00,000.00')).not.toBeInTheDocument()
    expect(within(locker).getByText('Reserved is not spent')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reserve money for August 2026' }))
    await user.type(screen.getByRole('textbox', { name: 'Reserve amount' }), '30000')
    await user.type(screen.getByRole('textbox', { name: 'Reserve purpose' }), 'Emergency fund')
    await user.click(screen.getByRole('button', { name: 'Save planned reserve' }))

    await waitFor(() => {
      expect(onReserve).toHaveBeenCalledWith({
        name: 'Emergency fund',
        amountMinor: 3000000,
        dueOn: '2026-08-01',
      })
    })
  })

  it('validates a reserve before calling the persistence boundary', async () => {
    const user = userEvent.setup()
    const onReserve = vi.fn().mockResolvedValue(undefined)
    renderWorkspace({ onReserve })

    await user.click(screen.getByRole('button', { name: 'Open locker' }))
    await user.click(screen.getByRole('button', { name: 'Reserve money for August 2026' }))
    await user.click(screen.getByRole('button', { name: 'Save planned reserve' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Enter an amount greater than ₹0')
    expect(onReserve).not.toHaveBeenCalled()
  })

  it('saves expected salary and keeps actual salary as a distinct state', async () => {
    const user = userEvent.setup()
    const onSaveSalary = vi.fn().mockResolvedValue(undefined)
    renderWorkspace({ onSaveSalary })

    const salaryInput = screen.getByRole('textbox', { name: 'Expected salary' })
    await user.clear(salaryInput)
    await user.type(salaryInput, '70000')
    await user.click(screen.getByRole('button', { name: 'Update expectation' }))

    await waitFor(() => {
      expect(onSaveSalary).toHaveBeenCalledWith({ expectedSalaryMinor: 7000000, expectedSalaryOn: '2026-08-01' })
    })
    expect(screen.getByText('Actual salary')).toBeInTheDocument()
    const salaryCard = screen.getByRole('region', { name: 'What is arriving?' })
    expect(within(salaryCard).getAllByText('₹65,000.00')).toHaveLength(2)
  })

  it('makes a negative disposable state explicit', () => {
    renderWorkspace({
      planning: {
        ...planning,
        summary: { ...planning.summary, disposableBalanceMinor: -500000 },
      },
    })

    expect(screen.getByText('−₹5,000.00')).toBeInTheDocument()
    expect(screen.getByText('Below zero: commitments exceed closing balance')).toBeInTheDocument()
  })

  it('explains an empty cycle while keeping planning actions available', () => {
    renderWorkspace({
      hasLedgerData: false,
      planning: {
        ...planning,
        cycle: { ...planning.cycle!, expectedSalaryMinor: undefined, expectedSalaryOn: undefined },
        summary: {
          ...planning.summary,
          openingActualMinor: 0,
          rolloverMinor: 0,
          expectedSalaryMinor: null,
          actualSalaryMinor: 0,
          salaryVarianceMinor: null,
          salaryStatus: 'unplanned',
          periodCreditsMinor: 0,
          periodDebitsMinor: 0,
          closingActualMinor: 0,
          reservedCommitmentMinor: 0,
          disposableBalanceMinor: 0,
        },
      },
    })

    expect(screen.getByLabelText('Empty planning cycle')).toHaveTextContent('A fresh month starts here.')
    expect(screen.getByRole('button', { name: 'Set expected salary' })).toBeInTheDocument()
  })

  it('shows intentional loading and error states', () => {
    const { rerender } = renderWorkspace({ planning: null, loading: true })
    expect(screen.getByLabelText('Loading planning workspace')).toBeInTheDocument()

    rerender(
      <PlanningWorkspace
        planning={null}
        cycleKey="2026-08"
        currency="INR"
        actualBalanceMinor={0}
        hasLedgerData={false}
        loading={false}
        error="The local planning service is unavailable."
        onSaveSalary={vi.fn().mockResolvedValue(undefined)}
        onReserve={vi.fn().mockResolvedValue(undefined)}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByText('The local planning service is unavailable.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
