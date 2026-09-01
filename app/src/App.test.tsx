import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App, { latestSalary, TransactionActions } from './App'
import { todayCivilDate } from './domain/money'
import { FIRST_USE_GUIDE_STORAGE_KEY } from './domain/onboarding'

const emptyDataset = {
  format: 'margin-backup',
  formatVersion: 2,
  schemaVersion: 3,
  appVersion: '0.1.0',
  exportedAt: '2026-08-15T12:00:00.000Z',
  currency: 'INR',
  entries: [],
  categories: [],
  commitments: [],
  balanceSnapshots: [],
  planningCycles: [],
}

const emptySummary = {
  incomeMinor: 0,
  expenseMinor: 0,
  expenseCreditMinor: 0,
  refundMinor: 0,
  investmentMinor: 0,
  spendingMinor: 0,
  actualBalanceMinor: 0,
  reservedCommitmentMinor: 0,
  disposableBalanceMinor: 0,
  entryCount: 0,
  activeEntryCount: 0,
}

const demoDataset = {
  ...emptyDataset,
  exportedAt: '2026-08-15T12:00:00.000Z',
  entries: [
    {
      id: 'synthetic-salary',
      type: 'income',
      amountMinor: 10000000,
      occurredOn: '2026-08-01',
      status: 'active',
      source: 'Synthetic salary',
      note: 'Synthetic data only',
    },
    {
      id: 'synthetic-expense',
      type: 'expense',
      amountMinor: 125000,
      occurredOn: '2026-08-03',
      status: 'active',
      note: 'Synthetic housing expense',
    },
    {
      id: 'synthetic-investment',
      type: 'investment',
      amountMinor: 1000000,
      occurredOn: '2026-08-07',
      status: 'active',
      note: 'Synthetic investment contribution',
    },
  ],
  commitments: [
    {
      id: 'synthetic-sip',
      kind: 'saving',
      name: 'Synthetic month-end reserve',
      plannedAmountMinor: 3000000,
      dueOn: '2026-08-31',
      status: 'planned',
      linkedEntryIds: [],
    },
  ],
  planningCycles: [
    {
      id: '2026-08',
      cycleKey: '2026-08',
      startOn: '2026-08-01',
      endOn: '2026-09-01',
      expectedSalaryMinor: 10000000,
      expectedSalaryOn: '2026-08-01',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ],
}

const demoSummary = {
  ...emptySummary,
  incomeMinor: 10000000,
  expenseMinor: 125000,
  investmentMinor: 1000000,
  spendingMinor: 1125000,
  actualBalanceMinor: 8875000,
  reservedCommitmentMinor: 3000000,
  disposableBalanceMinor: 5875000,
  entryCount: 3,
  activeEntryCount: 3,
}

const demoHistory = {
  range: { period: 'this-month', startOn: '2026-08-01', endOn: '2026-09-01' },
  filters: { period: 'this-month', type: 'all', status: 'active' },
  items: demoDataset.entries.map((entry) => ({ kind: 'entry', entry })),
  summary: {
    visibleCount: 3,
    activeCount: 3,
    voidedCount: 0,
    syncCount: 0,
    creditsMinor: 10000000,
    debitsMinor: 1125000,
    netMovementMinor: 8875000,
  },
}

function stubAppFetch() {
  const fetchMock = vi.fn((input: unknown) => {
    const path = String(input)
    let body: unknown = {}
    if (path.endsWith('/api/health')) body = { status: 'ok', storage: 'sqlite', databaseFile: 'margin.sqlite' }
    else if (path.endsWith('/api/dataset')) body = emptyDataset
    else if (path.endsWith('/api/summary')) body = emptySummary
    else if (path.endsWith('/api/demo')) {
      body = {
        mode: 'synthetic',
        demoVersion: 1,
        referenceOn: '2026-08-15',
        dataset: demoDataset,
        summary: demoSummary,
      }
    } else if (path.includes('/api/demo/history')) body = demoHistory
    else if (path.includes('/api/demo/planning-cycles/2026-08')) {
      body = {
        cycle: demoDataset.planningCycles[0],
        summary: {
          openingActualMinor: 0,
          rolloverMinor: 0,
          expectedSalaryMinor: 10000000,
          actualSalaryMinor: 10000000,
          salaryVarianceMinor: 0,
          salaryStatus: 'received',
          periodCreditsMinor: 10000000,
          periodDebitsMinor: 1125000,
          closingActualMinor: 8875000,
          reservedCommitmentMinor: 3000000,
          disposableBalanceMinor: 5875000,
        },
      }
    }
    return Promise.resolve({ ok: true, json: async () => body })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  window.localStorage.clear()
  window.location.hash = ''
})

afterEach(() => {
  vi.unstubAllGlobals()
})

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

describe('first-use guide and synthetic preview', () => {
  it('shows the guide once for an empty workspace and remembers the skip across remounts', async () => {
    const user = userEvent.setup()
    stubAppFetch()
    const first = render(<App />)

    expect(await screen.findByRole('heading', { name: 'See how Margin keeps money clear.' })).toBeInTheDocument()
    expect(window.localStorage.getItem(FIRST_USE_GUIDE_STORAGE_KEY)).toBe('seen')

    await user.click(screen.getByRole('button', { name: 'Skip guide' }))
    expect(screen.queryByRole('heading', { name: 'See how Margin keeps money clear.' })).not.toBeInTheDocument()

    first.unmount()
    render(<App />)
    await screen.findByText('Your workspace is ready')
    expect(screen.queryByRole('heading', { name: 'See how Margin keeps money clear.' })).not.toBeInTheDocument()
  })

  it('reopens the guide from Settings without changing the ledger', async () => {
    const user = userEvent.setup()
    stubAppFetch()
    render(<App />)
    await screen.findByText('Your workspace is ready')

    await user.click(screen.getByRole('link', { name: 'Open settings' }))
    await user.click(await screen.findByRole('button', { name: 'Show getting started guide' }))
    expect(await screen.findByRole('heading', { name: 'See how Margin keeps money clear.' })).toBeInTheDocument()
  })

  it('opens a read-only mid-month demo and exits without calling a write endpoint', async () => {
    const user = userEvent.setup()
    const fetchMock = stubAppFetch()
    render(<App />)
    await screen.findByRole('heading', { name: 'See how Margin keeps money clear.' })

    await user.click(screen.getByRole('button', { name: 'Try synthetic data' }))
    expect(await screen.findByText('Synthetic demo · Read-only')).toBeInTheDocument()
    expect(screen.getByText('Synthetic data only')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add transaction' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Real balance' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /See all/i }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/demo/history?period=this-month&type=all&status=active'),
        expect.any(Object),
      ),
    )
    expect(screen.getByText('Synthetic investment contribution')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: /Aug 2026/ })).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: 'Exit demo' }))
    await screen.findByText('Your ledger is quiet.')
    expect(screen.queryByText('Synthetic demo · Read-only')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/api/seed'))).toBe(false)
  })
})
