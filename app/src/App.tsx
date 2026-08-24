import { ChangeEvent, ReactNode, useEffect, useRef, useState } from 'react'
import { PlanningResponse, PlanningWorkspace, ReserveDraft } from './components/PlanningWorkspace'
import { SalaryRepeatButton, SalaryRepeatDraft } from './components/SalaryRepeatButton'
import { TransactionDraft, TransactionForm, TransactionKind } from './components/TransactionForm'
import { todayCivilDate } from './domain/money'

type Entry = {
  id: string
  type: string
  amountMinor: number
  occurredOn: string
  status: string
  name?: string
  note?: string
  source?: string
  categoryId?: string
}

type Commitment = {
  id: string
  kind: string
  name: string
  plannedAmountMinor: number
  dueOn: string
  status: string
}

type Dataset = {
  format: string
  formatVersion: number
  schemaVersion: number
  appVersion: string
  exportedAt: string
  currency: string
  entries: Entry[]
  categories: Array<{ id: string; name: string }>
  commitments: Commitment[]
  balanceSnapshots: Array<{ id: string; asOf: string; realBalanceMinor: number }>
}

type Summary = {
  incomeMinor: number
  expenseMinor: number
  refundMinor: number
  investmentMinor: number
  spendingMinor: number
  actualBalanceMinor: number
  reservedCommitmentMinor: number
  disposableBalanceMinor: number
  entryCount: number
  activeEntryCount: number
}

type Health = {
  status: string
  storage: string
  databaseFile: string
}

type BackupSummary = {
  sourceFormatVersion: number
  schemaVersion: number
  appVersion: string
  exportedAt: string
  currency: string
  counts: Record<string, number>
  warnings: string[]
}

type Route = 'home' | 'transactions' | 'insights' | 'commitments' | 'settings'
type IconName =
  | 'home'
  | 'transactions'
  | 'insights'
  | 'commitments'
  | 'settings'
  | 'plus'
  | 'arrow'
  | 'download'
  | 'upload'
  | 'reset'
  | 'refresh'
  | 'chevron'
  | 'wallet'
  | 'spark'

type Notice = {
  tone: 'info' | 'success' | 'error'
  text: string
}

const navigation: Array<{ key: Route; label: string; description: string; icon: IconName }> = [
  { key: 'home', label: 'Overview', description: 'Your money at a glance', icon: 'home' },
  { key: 'transactions', label: 'Transactions', description: 'Income and spending', icon: 'transactions' },
  { key: 'insights', label: 'Planning', description: 'Plan the current salary cycle', icon: 'insights' },
  { key: 'commitments', label: 'Commitments', description: 'What is already spoken for', icon: 'commitments' },
  { key: 'settings', label: 'Settings', description: 'Local data and preferences', icon: 'settings' },
]

function routeFromHash(): Route {
  const value = window.location.hash.replace('#', '') as Route
  return navigation.some((item) => item.key === value) ? value : 'home'
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Margin-Client': 'browser',
      ...init.headers,
    },
  })

  const body = await response.json()
  if (!response.ok) throw new Error(body.message ?? 'The local Margin service rejected the request.')
  return body as T
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amountMinor / 100)
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00.000Z`))
}

function amountLabel(entry: Entry, currency: string) {
  const positive = entry.type === 'income' || entry.type === 'refund'
  return `${positive ? '+' : '−'}${money(entry.amountMinor, currency)}`
}

function entryLabel(entry: Entry, categories: Dataset['categories'] = []) {
  if (entry.name) return entry.name
  if (entry.note) return entry.note
  if (entry.source) return entry.source
  if (entry.categoryId) return categories.find((category) => category.id === entry.categoryId)?.name ?? 'Expense'
  return entry.type.charAt(0).toUpperCase() + entry.type.slice(1)
}

export function latestSalary(entries: Entry[]) {
  return [...entries]
    .filter((entry) => entry.status === 'active' && entry.type === 'income')
    .sort((left, right) => left.occurredOn.localeCompare(right.occurredOn) || left.id.localeCompare(right.id))
    .at(-1)
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  const paths: Record<IconName, ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    transactions: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h10" />
        <path d="M4 17h7" />
        <path d="m17 15 3 3-3 3" />
        <path d="M20 18h-7" />
      </>
    ),
    insights: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h17" />
        <path d="m7 15 4-4 3 2 5-6" />
      </>
    ),
    commitments: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
        <path d="M8 14h3M8 17h5" />
      </>
    ),
    settings: (
      <>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path
          d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4V19a2 2 0 1 1-4 0v-.2A2 2 0 0 0 5.8 17l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A2 2 0 0 0 1.6 11H1.5a2 2 0 1 1 0-4h.2A2 2 0 0 0 3 3.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A2 2 0 0 0 9.2-.6H9a2 2 0 1 1 4 0v.2A2 2 0 0 0 16.4 1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A2 2 0 0 0 20.6 7h.2a2 2 0 1 1 0 4h-.2a2 2 0 0 0-1.2 4Z"
          transform="translate(1 1) scale(.92)"
        />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    upload: (
      <>
        <path d="M12 15V3" />
        <path d="m7 8 5-5 5 5" />
        <path d="M5 21h14" />
      </>
    ),
    reset: (
      <>
        <path d="M4 12a8 8 0 1 0 2.3-5.7" />
        <path d="M4 5v5h5" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14.7-4L4 9" />
        <path d="M4 4v5h5" />
        <path d="M4 13a8 8 0 0 0 14.7 4L20 15" />
        <path d="M20 20v-5h-5" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    wallet: (
      <>
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5Z" />
        <path d="M4 7h14" />
        <path d="M16 14h4" />
        <circle cx="16" cy="14" r=".6" fill="currentColor" stroke="none" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3-1.4 5.6L5 10l5.6 1.4L12 17l1.4-5.6L19 10l-5.6-1.4Z" />
        <path d="m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7Z" />
      </>
    ),
  }

  return <svg {...common}>{paths[name]}</svg>
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  )
}

function Button({
  children,
  variant = 'secondary',
  onClick,
  icon,
  type = 'button',
  disabled = false,
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  onClick?: () => void
  icon?: IconName
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <button className={`button button-${variant}`} type={type} onClick={onClick} disabled={disabled}>
      {children}
      {icon && <Icon name={icon} size={16} />}
    </button>
  )
}

function EmptyState({
  icon,
  eyebrow,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  icon: IconName
  eyebrow: string
  title: string
  description: string
  primaryLabel?: string
  onPrimary?: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name={icon} size={24} />
      </div>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="empty-actions">
        {primaryLabel && onPrimary && (
          <Button variant="primary" onClick={onPrimary} icon="arrow">
            {primaryLabel}
          </Button>
        )}
        {secondaryLabel && onSecondary && (
          <Button variant="quiet" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

export function TransactionActions({
  latestSalaryMinor,
  currency,
  onRepeatSalary,
  onOpenForm,
}: {
  latestSalaryMinor: number | null
  currency: string
  onRepeatSalary: (draft: SalaryRepeatDraft) => Promise<void>
  onOpenForm: (type?: TransactionKind) => void
}) {
  return (
    <div className="heading-actions">
      {latestSalaryMinor !== null && (
        <SalaryRepeatButton
          amountMinor={latestSalaryMinor}
          amountLabel={money(latestSalaryMinor, currency)}
          onRepeat={onRepeatSalary}
        />
      )}
      <Button variant="primary" icon="plus" onClick={() => onOpenForm()}>
        Add transaction
      </Button>
    </div>
  )
}

function Metric({
  label,
  value,
  note,
  accent = false,
}: {
  label: string
  value: string
  note?: string
  accent?: boolean
}) {
  return (
    <div className={`metric ${accent ? 'metric-accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  )
}

function ActivityRow({
  entry,
  currency,
  categories = [],
}: {
  entry: Entry
  currency: string
  categories?: Dataset['categories']
}) {
  const positive = entry.type === 'income' || entry.type === 'refund'
  return (
    <div className="activity-row">
      <div className={`activity-icon ${positive ? 'activity-icon-teal' : ''}`}>
        <Icon name={positive ? 'arrow' : 'transactions'} size={16} />
      </div>
      <div className="activity-copy">
        <strong>{entryLabel(entry, categories)}</strong>
        <span>
          {shortDate(entry.occurredOn)} · {entry.status}
        </span>
      </div>
      <strong className={positive ? 'amount-positive' : 'amount-negative'}>{amountLabel(entry, currency)}</strong>
    </div>
  )
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: (typeof navigation)[number]
  active: boolean
  onNavigate: (route: Route) => void
}) {
  return (
    <a
      className={`nav-link ${active ? 'nav-link-active' : ''}`}
      href={item.key === 'home' ? '#' : `#${item.key}`}
      onClick={() => onNavigate(item.key)}
    >
      <Icon name={item.icon} />
      <span>{item.label}</span>
      {active && <span className="nav-link-dot" />}
    </a>
  )
}

function HomeView({
  dataset,
  summary,
  health,
  onSeed,
  onNavigate,
  latestSalaryMinor,
  onRepeatSalary,
  onOpenForm,
}: {
  dataset: Dataset | null
  summary: Summary | null
  health: Health | null
  onSeed: () => void
  onNavigate: (route: Route) => void
  latestSalaryMinor: number | null
  onRepeatSalary: (draft: SalaryRepeatDraft) => Promise<void>
  onOpenForm: (type?: TransactionKind) => void
}) {
  const entries = dataset?.entries ?? []
  const commitments = dataset?.commitments ?? []
  const currency = dataset?.currency ?? 'INR'
  const hasData = entries.length > 0 || commitments.length > 0
  const actualBalance = summary?.actualBalanceMinor ?? 0

  return (
    <>
      <PageHeading
        eyebrow="Workspace / Overview"
        title="Good to see you."
        description="A clear view of what came in, what went out, and what is already spoken for."
        action={
          <TransactionActions
            latestSalaryMinor={latestSalaryMinor}
            currency={currency}
            onRepeatSalary={onRepeatSalary}
            onOpenForm={onOpenForm}
          />
        }
      />
      <div className="workspace-status">
        <span className={`status-dot ${health ? 'status-dot-online' : ''}`} />
        {health ? 'Local workspace connected' : 'Connecting to local workspace'}
        <span className="status-separator">·</span>Data stays on this device
      </div>
      {!hasData ? (
        <section className="panel panel-empty-home">
          <EmptyState
            icon="wallet"
            eyebrow="Your workspace is ready"
            title="Start with a little context."
            description="Add a salary or your first expense when you are ready. For a safe tour of the shell, load synthetic data first."
            primaryLabel="Add salary"
            onPrimary={() => onOpenForm('income')}
            secondaryLabel="Add expense"
            onSecondary={() => onOpenForm('expense')}
          />
          <div className="empty-support">
            <Button variant="quiet" icon="spark" onClick={onSeed}>
              Load synthetic workspace
            </Button>
            <Button variant="quiet" onClick={() => onNavigate('transactions')}>
              View transactions
            </Button>
          </div>
        </section>
      ) : (
        <>
          <div className="overview-grid">
            <section className="balance-card">
              <div className="balance-card-top">
                <span className="card-label">Actual balance</span>
                <span className="card-kicker">Current workspace</span>
              </div>
              <strong className="balance-value">{money(actualBalance, currency)}</strong>
              <p className="balance-caption">
                Calculated from active local records. Planned commitments are reserved separately.
              </p>
              <div className="balance-line">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="balance-footer">
                <span>
                  <span className="status-dot status-dot-teal" />
                  Local and private
                </span>
                <Button variant="quiet" onClick={() => onNavigate('transactions')} icon="arrow">
                  Review activity
                </Button>
              </div>
            </section>
            <section className="panel snapshot-panel">
              <div className="panel-heading">
                <div>
                  <p className="card-label">At a glance</p>
                  <h2>Where things stand</h2>
                </div>
                <div className="panel-mark">
                  <Icon name="spark" size={18} />
                </div>
              </div>
              <div className="metric-list">
                <Metric
                  label="Recorded income"
                  value={money(summary?.incomeMinor ?? 0, currency)}
                  note="Active salary records"
                />
                <Metric
                  label="Recorded spending"
                  value={money(summary?.spendingMinor ?? 0, currency)}
                  note={`${entries.filter((entry) => entry.type === 'expense').length} expenses`}
                />
                <Metric
                  label="Disposable balance"
                  value={money(summary?.disposableBalanceMinor ?? 0, currency)}
                  note={`${commitments.length} commitments`}
                  accent
                />
                <Metric
                  label="Ledger entries"
                  value={String(summary?.activeEntryCount ?? entries.length)}
                  note="Active records"
                />
              </div>
            </section>
          </div>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h2>Keep an eye on the details.</h2>
            </div>
            <a className="text-link" href="#transactions" onClick={() => onNavigate('transactions')}>
              See all <Icon name="arrow" size={15} />
            </a>
          </div>
          <div className="content-grid">
            <section className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <h2>Latest entries</h2>
                  <p>Small details, no clutter.</p>
                </div>
                <span className="panel-count">{entries.length}</span>
              </div>
              {entries.slice(0, 5).map((entry) => (
                <ActivityRow key={entry.id} entry={entry} currency={currency} categories={dataset?.categories} />
              ))}
            </section>
            <section className="panel next-panel">
              <div className="next-panel-icon">
                <Icon name="commitments" size={20} />
              </div>
              <p className="eyebrow">Next up</p>
              <h2>{commitments.length > 0 ? 'Your commitments are visible.' : 'Make room for future you.'}</h2>
              <p>
                {commitments.length > 0
                  ? 'Planned payments are separated from actual spending so your available balance stays honest.'
                  : 'SIPs, RDs, and recurring obligations will live here, beside what you have actually spent.'}
              </p>
              <Button variant="secondary" onClick={() => onNavigate('commitments')} icon="arrow">
                View commitments
              </Button>
            </section>
          </div>
        </>
      )}
    </>
  )
}

function TransactionsView({
  dataset,
  onSeed,
  onNavigate,
  latestSalaryMinor,
  onRepeatSalary,
  onOpenForm,
  onRefresh,
}: {
  dataset: Dataset | null
  onSeed: () => void
  onNavigate: (route: Route) => void
  latestSalaryMinor: number | null
  onRepeatSalary: (draft: SalaryRepeatDraft) => Promise<void>
  onOpenForm: (type?: TransactionKind) => void
  onRefresh: () => void
}) {
  const entries = dataset?.entries ?? []
  const currency = dataset?.currency ?? 'INR'
  return (
    <>
      <PageHeading
        eyebrow="Workspace / Transactions"
        title="Transactions"
        description="Every debit and credit in one calm, chronological view."
        action={
          <TransactionActions
            latestSalaryMinor={latestSalaryMinor}
            currency={currency}
            onRepeatSalary={onRepeatSalary}
            onOpenForm={onOpenForm}
          />
        }
      />
      {entries.length === 0 ? (
        <section className="panel">
          <EmptyState
            icon="transactions"
            eyebrow="No entries yet"
            title="Your ledger is quiet."
            description="When you add income or spending, it will appear here with a date, category, and clear effect on your balance."
            primaryLabel="Add salary"
            onPrimary={() => onOpenForm('income')}
            secondaryLabel="Add expense"
            onSecondary={() => onOpenForm('expense')}
          />
          <div className="empty-support">
            <Button variant="quiet" icon="spark" onClick={onSeed}>
              Load synthetic workspace
            </Button>
            <Button variant="quiet" onClick={() => onNavigate('home')}>
              Back to overview
            </Button>
          </div>
        </section>
      ) : (
        <section className="panel table-panel">
          <div className="table-toolbar">
            <div>
              <h2>All entries</h2>
              <p>{entries.length} records in your local ledger</p>
            </div>
            <Button variant="quiet" icon="refresh" onClick={onRefresh}>
              Refresh
            </Button>
          </div>
          <div className="transaction-list">
            {entries.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} currency={currency} categories={dataset?.categories} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function CommitmentsView({
  dataset,
  onSeed,
  onNavigate,
  onNotice,
}: {
  dataset: Dataset | null
  onSeed: () => void
  onNavigate: (route: Route) => void
  onNotice: (notice: Notice) => void
}) {
  const commitments = dataset?.commitments ?? []
  const currency = dataset?.currency ?? 'INR'
  return (
    <>
      <PageHeading
        eyebrow="Workspace / Commitments"
        title="Commitments"
        description="See what is already spoken for before you decide what is available."
        action={
          <Button
            variant="primary"
            icon="plus"
            onClick={() =>
              onNotice({
                tone: 'info',
                text: 'Commitment entry will follow the domain flow. This surface is ready for it.',
              })
            }
          >
            Add commitment
          </Button>
        }
      />
      {commitments.length === 0 ? (
        <section className="panel">
          <EmptyState
            icon="commitments"
            eyebrow="Nothing planned yet"
            title="Leave room for future commitments."
            description="SIPs, RDs, subscriptions, and recurring obligations will be kept separate from the transactions you have already made."
            primaryLabel="Load synthetic workspace"
            onPrimary={onSeed}
            secondaryLabel="Back to overview"
            onSecondary={() => onNavigate('home')}
          />
        </section>
      ) : (
        <section className="panel table-panel">
          <div className="table-toolbar">
            <div>
              <h2>Planned commitments</h2>
              <p>{commitments.length} planned items in your local workspace</p>
            </div>
          </div>
          <div className="commitment-list">
            {commitments.map((item) => (
              <div className="commitment-row" key={item.id}>
                <div className="activity-icon activity-icon-teal">
                  <Icon name="commitments" size={16} />
                </div>
                <div className="activity-copy">
                  <strong>{item.name}</strong>
                  <span>
                    {item.kind} · due {shortDate(item.dueOn)}
                  </span>
                </div>
                <div className="commitment-amount">
                  <strong>{money(item.plannedAmountMinor, currency)}</strong>
                  <span>{item.status}</span>
                </div>
                <Icon name="chevron" size={16} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function SettingsView({
  health,
  onSeed,
  onExport,
  onImportClick,
  onReset,
}: {
  health: Health | null
  onSeed: () => void
  onExport: () => void
  onImportClick: () => void
  onReset: () => void
}) {
  return (
    <>
      <PageHeading
        eyebrow="Workspace / Settings"
        title="Settings"
        description="Keep the local setup understandable, portable, and easy to recover."
      />
      <div className="settings-grid">
        <section className="panel settings-card">
          <div className="panel-heading">
            <div>
              <p className="card-label">Storage</p>
              <h2>Local by default.</h2>
            </div>
            <div className="panel-mark">
              <Icon name="wallet" size={18} />
            </div>
          </div>
          <p>
            Your primary ledger lives in a SQLite file on this computer, outside browser storage. Clearing browser data
            or switching browsers does not remove it.
          </p>
          <dl className="settings-details">
            <div>
              <dt>Connection</dt>
              <dd>
                <span className="status-dot status-dot-online" />
                {health ? 'Connected' : 'Unavailable'}
              </dd>
            </div>
            <div>
              <dt>Storage mode</dt>
              <dd>{health?.storage ?? 'SQLite'}</dd>
            </div>
            <div>
              <dt>Database file</dt>
              <dd>{health?.databaseFile ?? 'OS application data directory'}</dd>
            </div>
          </dl>
        </section>
        <section className="panel settings-card">
          <div className="panel-heading">
            <div>
              <p className="card-label">Backup</p>
              <h2>Keep a copy you control.</h2>
            </div>
            <div className="panel-mark panel-mark-teal">
              <Icon name="download" size={18} />
            </div>
          </div>
          <p>
            JSON is the lossless backup format. Download it to another drive or import it on another machine when
            needed.
          </p>
          <div className="settings-actions">
            <Button variant="primary" icon="download" onClick={onExport}>
              Export JSON backup
            </Button>
            <Button variant="secondary" icon="upload" onClick={onImportClick}>
              Import JSON backup
            </Button>
          </div>
        </section>
        <section className="panel settings-card settings-card-wide">
          <div className="panel-heading">
            <div>
              <p className="card-label">Workspace tools</p>
              <h2>Synthetic data and reset</h2>
            </div>
            <div className="panel-mark">
              <Icon name="settings" size={18} />
            </div>
          </div>
          <p>
            Use synthetic records to explore the product safely. Reset removes Margin records only; it does not touch
            downloaded backups or unrelated files.
          </p>
          <div className="settings-actions">
            <Button variant="secondary" icon="spark" onClick={onSeed}>
              Load synthetic data
            </Button>
            <Button variant="danger" icon="reset" onClick={onReset}>
              Reset local records
            </Button>
          </div>
        </section>
      </div>
    </>
  )
}

function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [planning, setPlanning] = useState<PlanningResponse | null>(null)
  const [planningLoading, setPlanningLoading] = useState(false)
  const [planningError, setPlanningError] = useState<string | null>(null)
  const planningCycleKey = todayCivilDate().slice(0, 7)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [transactionForm, setTransactionForm] = useState<{ type: TransactionKind } | null>(null)
  const importInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleHashChange = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  async function refresh() {
    setLoading(true)
    try {
      const [nextHealth, nextDataset, nextSummary] = await Promise.all([
        request<Health>('/api/health'),
        request<Dataset>('/api/dataset'),
        request<Summary>('/api/summary'),
      ])
      setHealth(nextHealth)
      setDataset(nextDataset)
      setSummary(nextSummary)
    } catch (reason) {
      setNotice({
        tone: 'error',
        text: reason instanceof Error ? reason.message : 'Unable to reach the local Margin service.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function loadPlanning() {
    setPlanningLoading(true)
    setPlanningError(null)
    try {
      const nextPlanning = await request<PlanningResponse>(`/api/planning-cycles/${planningCycleKey}`)
      setPlanning(nextPlanning)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to open the planning workspace.'
      setPlanningError(message)
    } finally {
      setPlanningLoading(false)
    }
  }

  useEffect(() => {
    if (route === 'insights') void loadPlanning()
  }, [route])

  function navigate(nextRoute: Route) {
    if (nextRoute !== 'home' && nextRoute !== 'transactions') setTransactionForm(null)
    window.location.hash = nextRoute === 'home' ? '' : nextRoute
  }

  function openTransactionForm(type: TransactionKind = 'expense') {
    setTransactionForm({ type })
  }

  async function createTransaction(draft: TransactionDraft) {
    await request('/api/entries', { method: 'POST', body: JSON.stringify(draft) })
    setTransactionForm(null)
    setNotice({
      tone: 'success',
      text: draft.type === 'income' ? 'Salary added to your local ledger.' : 'Expense added to your local ledger.',
    })
    await refresh()
  }

  async function repeatSalary(draft: SalaryRepeatDraft) {
    try {
      await request('/api/entries', { method: 'POST', body: JSON.stringify(draft) })
      setNotice({ tone: 'success', text: 'Salary added for today.' })
      await refresh()
    } catch (reason) {
      setNotice({ tone: 'error', text: reason instanceof Error ? reason.message : 'Unable to add salary.' })
    }
  }

  async function saveExpectedSalary(input: { expectedSalaryMinor: number; expectedSalaryOn?: string }) {
    try {
      const method = planning?.cycle ? 'PUT' : 'POST'
      const path = planning?.cycle ? `/api/planning-cycles/${planningCycleKey}` : '/api/planning-cycles'
      await request(path, {
        method,
        body: JSON.stringify({ cycleKey: planningCycleKey, ...input }),
      })
      setNotice({ tone: 'success', text: 'Expected salary saved for this planning cycle.' })
      await loadPlanning()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to save expected salary.'
      setPlanningError(message)
      throw new Error(message, { cause: reason })
    }
  }

  async function reserveForCycle(draft: ReserveDraft) {
    try {
      await request('/api/collections/commitments', {
        method: 'POST',
        body: JSON.stringify({
          id: globalThis.crypto.randomUUID(),
          kind: 'saving',
          name: draft.name,
          plannedAmountMinor: draft.amountMinor,
          dueOn: draft.dueOn,
          status: 'planned',
          linkedEntryIds: [],
        }),
      })
      setNotice({
        tone: 'success',
        text: 'Planned reserve saved. Your actual balance is unchanged; disposable balance now reflects the plan.',
      })
      await Promise.all([refresh(), loadPlanning()])
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to save planned reserve.'
      setPlanningError(message)
      throw new Error(message, { cause: reason })
    }
  }

  async function seedSyntheticData() {
    try {
      await request<Dataset>('/api/seed', { method: 'POST', body: '{}' })
      setNotice({ tone: 'success', text: 'Synthetic data loaded into the local workspace.' })
      await refresh()
    } catch (reason) {
      setNotice({ tone: 'error', text: reason instanceof Error ? reason.message : 'Unable to seed synthetic data.' })
    }
  }

  async function exportBackup() {
    try {
      const backup = await request<unknown>('/api/backup')
      const blob = new Blob([JSON.stringify(backup, null, 2) + '\n'], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `margin-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setNotice({ tone: 'success', text: 'Backup downloaded. Store the JSON file somewhere safe.' })
    } catch (reason) {
      setNotice({ tone: 'error', text: reason instanceof Error ? reason.message : 'Unable to export a backup.' })
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const backup = JSON.parse(await file.text()) as unknown
      const summary = await request<BackupSummary>('/api/backup/validate', {
        method: 'POST',
        body: JSON.stringify(backup),
      })
      const countLabel = Object.entries(summary.counts)
        .map(([collection, count]) => `${count} ${collection}`)
        .join(', ')
      const warningLabel = summary.warnings.length > 0 ? `\n\nNote: ${summary.warnings.join(' ')}` : ''
      if (
        !window.confirm(
          `Restore the ${summary.currency} backup from ${summary.exportedAt.slice(0, 10)}?\n\n${countLabel}.\n\nThis replaces the current local dataset. A recovery snapshot will be created first.${warningLabel}`,
        )
      )
        return
      await request<{ summary: BackupSummary }>('/api/backup/restore', { method: 'POST', body: JSON.stringify(backup) })
      setNotice({
        tone: 'success',
        text: 'Backup restored successfully. A pre-restore recovery snapshot was saved locally.',
      })
      await refresh()
    } catch (reason) {
      setNotice({ tone: 'error', text: reason instanceof Error ? reason.message : 'Unable to restore this backup.' })
    }
  }

  async function resetData() {
    if (!window.confirm('Reset all Margin local records? Downloaded JSON backups will not be touched.')) return
    try {
      await request<Dataset>('/api/reset', { method: 'POST', body: '{}' })
      setNotice({ tone: 'success', text: 'Local records reset. Unrelated files were not touched.' })
      await refresh()
    } catch (reason) {
      setNotice({ tone: 'error', text: reason instanceof Error ? reason.message : 'Unable to reset local data.' })
    }
  }

  const activeNavigation = navigation.find((item) => item.key === route) ?? navigation[0]
  const latestSalaryMinor = latestSalary(dataset?.entries ?? [])?.amountMinor ?? null

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => navigate('home')}>
          <span className="brand-mark">M</span>
          <span>
            <strong>Margin</strong>
            <small>Personal finance, locally.</small>
          </span>
        </a>
        <div className="sidebar-group">
          <span className="sidebar-label">Workspace</span>
          <nav aria-label="Primary navigation">
            {navigation.map((item) => (
              <NavLink key={item.key} item={item} active={item.key === route} onNavigate={navigate} />
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="storage-pill">
            <span className="status-dot status-dot-online" />
            <span>
              <strong>Local workspace</strong>
              <small>{health ? 'Connected and private' : 'Connecting…'}</small>
            </span>
          </div>
          <div className="sidebar-footnote">
            <span className="teal-tick" />
            No cloud account required
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">M</span>
            <strong>Margin</strong>
          </div>
          <div className="topbar-context">
            <span className="topbar-section">{activeNavigation.label}</span>
            <span className="topbar-separator">/</span>
            <span>{activeNavigation.description}</span>
          </div>
          <div className="topbar-actions">
            <span className="connection-label">
              <span className="status-dot status-dot-online" />
              Local only
            </span>
            <a className="icon-button" href="#settings" aria-label="Open settings" onClick={() => navigate('settings')}>
              <Icon name="settings" size={18} />
            </a>
          </div>
        </header>
        <main className="content" id="main-content">
          {notice && (
            <div className={`notice notice-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
              <span>{notice.text}</span>
              <button
                type="button"
                className="notice-close"
                aria-label="Dismiss notice"
                onClick={() => setNotice(null)}
              >
                ×
              </button>
            </div>
          )}
          {transactionForm && (route === 'home' || route === 'transactions') && (
            <TransactionForm
              key={transactionForm.type}
              defaultType={transactionForm.type}
              categories={dataset?.categories}
              onSubmit={createTransaction}
              onClose={() => setTransactionForm(null)}
            />
          )}
          {loading && !dataset ? (
            <section className="panel loading-panel">
              <span className="status-dot status-dot-teal" />
              Connecting to your local workspace…
            </section>
          ) : route === 'home' ? (
            <HomeView
              dataset={dataset}
              summary={summary}
              health={health}
              onSeed={() => void seedSyntheticData()}
              onNavigate={navigate}
              latestSalaryMinor={latestSalaryMinor}
              onRepeatSalary={repeatSalary}
              onOpenForm={openTransactionForm}
            />
          ) : route === 'transactions' ? (
            <TransactionsView
              dataset={dataset}
              onSeed={() => void seedSyntheticData()}
              onNavigate={navigate}
              latestSalaryMinor={latestSalaryMinor}
              onRepeatSalary={repeatSalary}
              onOpenForm={openTransactionForm}
              onRefresh={() => void refresh()}
            />
          ) : route === 'insights' ? (
            <PlanningWorkspace
              planning={planning}
              cycleKey={planningCycleKey}
              currency={dataset?.currency ?? 'INR'}
              actualBalanceMinor={summary?.actualBalanceMinor ?? 0}
              hasLedgerData={Boolean(dataset && (dataset.entries.length > 0 || dataset.commitments.length > 0))}
              loading={planningLoading}
              error={planningError}
              onSaveSalary={saveExpectedSalary}
              onReserve={reserveForCycle}
              onRetry={() => void loadPlanning()}
            />
          ) : route === 'commitments' ? (
            <CommitmentsView
              dataset={dataset}
              onSeed={() => void seedSyntheticData()}
              onNavigate={navigate}
              onNotice={setNotice}
            />
          ) : (
            <SettingsView
              health={health}
              onSeed={() => void seedSyntheticData()}
              onExport={() => void exportBackup()}
              onImportClick={() => importInput.current?.click()}
              onReset={() => void resetData()}
            />
          )}
        </main>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navigation.map((item) => (
            <NavLink key={item.key} item={item} active={item.key === route} onNavigate={navigate} />
          ))}
        </nav>
      </div>
      <input
        ref={importInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => void importBackup(event)}
      />
    </div>
  )
}

export default App
