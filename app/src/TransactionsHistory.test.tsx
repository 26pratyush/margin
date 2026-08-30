import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TransactionsView } from './App'
import { HistoryEntry, HistoryResponse } from './domain/history'
import { todayCivilDate } from './domain/money'

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'expense-1',
    type: 'expense',
    amountMinor: 1000,
    occurredOn: todayCivilDate(),
    status: 'active',
    createdAt: '2026-08-30T10:00:00.000Z',
    updatedAt: '2026-08-30T10:00:00.000Z',
    ...overrides,
  }
}

function response(items: HistoryResponse['items']): HistoryResponse {
  return {
    range: { period: 'this-month', startOn: '2026-08-01', endOn: '2026-09-01' },
    filters: { period: 'this-month', type: 'all', status: 'active' },
    items,
    summary: {
      visibleCount: items.length,
      activeCount: items.filter((item) => item.kind === 'balance-sync' || item.entry.status === 'active').length,
      voidedCount: items.filter((item) => item.kind === 'entry' && item.entry.status === 'voided').length,
      syncCount: items.filter((item) => item.kind === 'balance-sync').length,
      creditsMinor: 0,
      debitsMinor: 1000,
      netMovementMinor: -1000,
    },
  }
}

function renderTransactions(history: HistoryResponse) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => history })
  vi.stubGlobal('fetch', fetchMock)
  render(
    <TransactionsView
      dataset={{
        format: 'margin-backup',
        formatVersion: 1,
        schemaVersion: 3,
        appVersion: '0.1.0',
        exportedAt: '2026-08-30T12:00:00.000Z',
        currency: 'INR',
        entries: history.items.flatMap((item) =>
          item.kind === 'entry' ? [item.entry] : item.adjustment ? [item.adjustment] : [],
        ),
        categories: [],
        commitments: [],
        balanceSnapshots: history.items.flatMap((item) => (item.kind === 'balance-sync' ? [item.snapshot] : [])),
      }}
      summary={{
        incomeMinor: 0,
        expenseMinor: 1000,
        refundMinor: 0,
        investmentMinor: 0,
        spendingMinor: 1000,
        actualBalanceMinor: -1000,
        reservedCommitmentMinor: 0,
        disposableBalanceMinor: -1000,
        entryCount: 1,
        activeEntryCount: 1,
      }}
      onSeed={vi.fn()}
      onNavigate={vi.fn()}
      latestSalaryMinor={null}
      onRepeatSalary={vi.fn().mockResolvedValue(undefined)}
      onOpenForm={vi.fn()}
      onRefresh={vi.fn()}
    />,
  )
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('transaction history filters', () => {
  it('loads the active current-month view and groups rows by civil day', async () => {
    const current = todayCivilDate()
    const fetchMock = renderTransactions(
      response([
        { kind: 'entry', entry: entry({ id: 'today', name: 'Lunch', occurredOn: current }) },
        { kind: 'entry', entry: entry({ id: 'yesterday', name: 'Coffee', occurredOn: '2026-08-29' }) },
      ]),
    )

    expect(await screen.findByText('Lunch')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByText('Filters do not change your balance.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('period=this-month&type=all&status=active'),
      expect.objectContaining({ headers: expect.any(Object) }),
    )
  })

  it('supports instant presets, inclusive custom ranges, and reset', async () => {
    const user = userEvent.setup()
    const fetchMock = renderTransactions(response([{ kind: 'entry', entry: entry({ name: 'Lunch' }) }]))

    await user.click(screen.getByRole('button', { name: 'This week' }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('period=this-week&type=all&status=active'),
        expect.any(Object),
      ),
    )

    await user.click(screen.getByRole('button', { name: 'Custom range' }))
    fireEvent.change(screen.getByLabelText('Custom range start'), { target: { value: '2026-08-28' } })
    fireEvent.change(screen.getByLabelText('Custom range end'), { target: { value: '2026-09-02' } })
    await user.click(screen.getByRole('button', { name: 'Apply range' }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('period=custom&type=all&status=active&startOn=2026-08-28&endOn=2026-09-03'),
        expect.any(Object),
      ),
    )

    await user.click(screen.getByRole('button', { name: 'Reset filters' }))
    expect(screen.getByRole('button', { name: 'This month' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('rejects an inverted custom range without requesting a new history projection', async () => {
    const user = userEvent.setup()
    const fetchMock = renderTransactions(response([{ kind: 'entry', entry: entry({ name: 'Lunch' }) }]))
    await screen.findByText('Lunch')
    const initialCallCount = fetchMock.mock.calls.length

    await user.click(screen.getByRole('button', { name: 'Custom range' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(initialCallCount + 1))
    const customCallCount = fetchMock.mock.calls.length
    fireEvent.change(screen.getByLabelText('Custom range start'), { target: { value: '2026-09-02' } })
    fireEvent.change(screen.getByLabelText('Custom range end'), { target: { value: '2026-09-01' } })
    await user.click(screen.getByRole('button', { name: 'Apply range' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/start date must be on or before/i)
    expect(fetchMock).toHaveBeenCalledTimes(customCallCount)
  })

  it('reveals voided lineage and balance-sync rows when history is broadened', async () => {
    const user = userEvent.setup()
    const voided = entry({ id: 'voided', name: 'Old lunch', status: 'voided', voidReason: 'Duplicate' })
    const replacement = entry({ id: 'replacement', name: 'Corrected lunch', replacesId: 'voided' })
    const adjustment = entry({
      id: 'sync-adjustment',
      type: 'adjustment',
      amountMinor: 250,
      direction: 'debit',
      adjustmentReason: 'reconciliation',
    })
    const fetchMock = renderTransactions(
      response([
        { kind: 'entry', entry: voided },
        { kind: 'entry', entry: replacement },
        {
          kind: 'balance-sync',
          snapshot: {
            id: 'sync-1',
            asOf: todayCivilDate(),
            calculatedActualBalanceMinor: 1000,
            realBalanceMinor: 750,
            differenceMinor: -250,
            adjustmentEntryId: adjustment.id,
            reviewState: 'needs-review',
          },
          adjustment,
        },
      ]),
    )

    expect(screen.queryByText('Old lunch')).not.toBeInTheDocument()
    await user.click(
      within(screen.getByRole('group', { name: 'History status' })).getByRole('button', { name: /^All$/ }),
    )
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('status=all'), expect.any(Object)),
    )
    expect(await screen.findByText('Old lunch')).toBeInTheDocument()
    expect(screen.getByText(/Voided · Duplicate/)).toBeInTheDocument()
    expect(screen.getAllByText('Balance sync')).toHaveLength(2)
    expect(screen.getByText(/Needs review/)).toBeInTheDocument()
  })
})
