import { ChangeEvent, ReactNode, useEffect, useRef, useState } from 'react'

type Entry = {
  id: string
  type: string
  amountMinor: number
  occurredOn: string
  status: string
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
type IconName = 'home' | 'transactions' | 'insights' | 'commitments' | 'settings' | 'plus' | 'arrow' | 'download' | 'upload' | 'reset' | 'refresh' | 'chevron' | 'wallet' | 'spark'

type Notice = {
  tone: 'info' | 'success' | 'error'
  text: string
}

const navigation: Array<{ key: Route; label: string; description: string; icon: IconName }> = [
  { key: 'home', label: 'Overview', description: 'Your money at a glance', icon: 'home' },
  { key: 'transactions', label: 'Transactions', description: 'Income and spending', icon: 'transactions' },
  { key: 'insights', label: 'Insights', description: 'Patterns over time', icon: 'insights' },
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

function entryLabel(entry: Entry) {
  return entry.note ?? entry.source ?? (entry.type.charAt(0).toUpperCase() + entry.type.slice(1))
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    transactions: <><path d="M4 7h16" /><path d="M4 12h10" /><path d="M4 17h7" /><path d="m17 15 3 3-3 3" /><path d="M20 18h-7" /></>,
    insights: <><path d="M4 19V5" /><path d="M4 19h17" /><path d="m7 15 4-4 3 2 5-6" /></>,
    commitments: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /><path d="M8 14h3M8 17h5" /></>,
    settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4V19a2 2 0 1 1-4 0v-.2A2 2 0 0 0 5.8 17l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A2 2 0 0 0 1.6 11H1.5a2 2 0 1 1 0-4h.2A2 2 0 0 0 3 3.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A2 2 0 0 0 9.2-.6H9a2 2 0 1 1 4 0v.2A2 2 0 0 0 16.4 1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A2 2 0 0 0 20.6 7h.2a2 2 0 1 1 0 4h-.2a2 2 0 0 0-1.2 4Z" transform="translate(1 1) scale(.92)" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    upload: <><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 21h14" /></>,
    reset: <><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 5v5h5" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.7-4L4 9" /><path d="M4 4v5h5" /><path d="M4 13a8 8 0 0 0 14.7 4L20 15" /><path d="M20 20v-5h-5" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    wallet: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5Z" /><path d="M4 7h14" /><path d="M16 14h4" /><circle cx="16" cy="14" r=".6" fill="currentColor" stroke="none" /></>,
    spark: <><path d="m12 3-1.4 5.6L5 10l5.6 1.4L12 17l1.4-5.6L19 10l-5.6-1.4Z" /><path d="m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7Z" /></>,
  }

  return <svg {...common}>{paths[name]}</svg>
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>
}

function Button({ children, variant = 'secondary', onClick, icon, type = 'button', disabled = false }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; onClick?: () => void; icon?: IconName; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <button className={`button button-${variant}`} type={type} onClick={onClick} disabled={disabled}>{children}{icon && <Icon name={icon} size={16} />}</button>
}

function EmptyState({ icon, eyebrow, title, description, primaryLabel, onPrimary, secondaryLabel, onSecondary }: { icon: IconName; eyebrow: string; title: string; description: string; primaryLabel?: string; onPrimary?: () => void; secondaryLabel?: string; onSecondary?: () => void }) {
  return <div className="empty-state"><div className="empty-icon"><Icon name={icon} size={24} /></div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p><div className="empty-actions">{primaryLabel && onPrimary && <Button variant="primary" onClick={onPrimary} icon="arrow">{primaryLabel}</Button>}{secondaryLabel && onSecondary && <Button variant="quiet" onClick={onSecondary}>{secondaryLabel}</Button>}</div></div>
}

function Metric({ label, value, note, accent = false }: { label: string; value: string; note?: string; accent?: boolean }) {
  return <div className={`metric ${accent ? 'metric-accent' : ''}`}><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>
}

function ActivityRow({ entry, currency }: { entry: Entry; currency: string }) {
  const positive = entry.type === 'income' || entry.type === 'refund'
  return <div className="activity-row"><div className={`activity-icon ${positive ? 'activity-icon-teal' : ''}`}><Icon name={positive ? 'arrow' : 'transactions'} size={16} /></div><div className="activity-copy"><strong>{entryLabel(entry)}</strong><span>{shortDate(entry.occurredOn)} · {entry.status}</span></div><strong className={positive ? 'amount-positive' : 'amount-negative'}>{amountLabel(entry, currency)}</strong></div>
}

function NavLink({ item, active, onNavigate }: { item: (typeof navigation)[number]; active: boolean; onNavigate: (route: Route) => void }) {
  return <a className={`nav-link ${active ? 'nav-link-active' : ''}`} href={item.key === 'home' ? '#' : `#${item.key}`} onClick={() => onNavigate(item.key)}><Icon name={item.icon} /><span>{item.label}</span>{active && <span className="nav-link-dot" />}</a>
}

function HomeView({ dataset, health, onSeed, onNavigate, onNotice }: { dataset: Dataset | null; health: Health | null; onSeed: () => void; onNavigate: (route: Route) => void; onNotice: (notice: Notice) => void }) {
  const entries = dataset?.entries ?? []
  const commitments = dataset?.commitments ?? []
  const currency = dataset?.currency ?? 'INR'
  const activeEntries = entries.filter((entry) => entry.status === 'active')
  const actualBalance = activeEntries.reduce((total, entry) => (entry.type === 'income' || entry.type === 'refund' ? total + entry.amountMinor : total - entry.amountMinor), 0)
  const spent = activeEntries.filter((entry) => ['expense', 'investment'].includes(entry.type)).reduce((total, entry) => total + entry.amountMinor, 0)
  const committed = commitments.filter((item) => item.status !== 'cancelled' && item.status !== 'settled').reduce((total, item) => total + item.plannedAmountMinor, 0)
  const hasData = entries.length > 0 || commitments.length > 0

  return <><PageHeading eyebrow="Workspace / Overview" title="Good to see you." description="A clear view of what came in, what went out, and what is already spoken for." action={<Button variant="primary" icon="plus" onClick={() => onNotice({ tone: 'info', text: 'Transaction entry will land in the next ledger slice. This shell is ready for it.' })}>Add transaction</Button>} /><div className="workspace-status"><span className={`status-dot ${health ? 'status-dot-online' : ''}`} />{health ? 'Local workspace connected' : 'Connecting to local workspace'}<span className="status-separator">·</span>Data stays on this device</div>{!hasData ? <section className="panel panel-empty-home"><EmptyState icon="wallet" eyebrow="Your workspace is ready" title="Start with a little context." description="Add a salary or your first expense when you are ready. For a safe tour of the shell, load synthetic data first." primaryLabel="Load synthetic workspace" onPrimary={onSeed} secondaryLabel="View transactions" onSecondary={() => onNavigate('transactions')} /></section> : <><div className="overview-grid"><section className="balance-card"><div className="balance-card-top"><span className="card-label">Actual balance</span><span className="card-kicker">This month</span></div><strong className="balance-value">{money(actualBalance, currency)}</strong><p className="balance-caption">Calculated from your active ledger entries. Planned commitments are shown separately.</p><div className="balance-line"><span /><span /><span /><span /><span /><span /><span /></div><div className="balance-footer"><span><span className="status-dot status-dot-teal" />Local and private</span><Button variant="quiet" onClick={() => onNavigate('transactions')} icon="arrow">Review activity</Button></div></section><section className="panel snapshot-panel"><div className="panel-heading"><div><p className="card-label">At a glance</p><h2>Where things stand</h2></div><div className="panel-mark"><Icon name="spark" size={18} /></div></div><div className="metric-list"><Metric label="Spent this month" value={money(spent, currency)} note={`${entries.filter((entry) => entry.type === 'expense').length} expenses`} /><Metric label="Committed next" value={money(committed, currency)} note={`${commitments.length} commitments`} accent /><Metric label="Ledger entries" value={String(entries.length)} note="All active records" /></div></section></div><div className="section-heading"><div><p className="eyebrow">Recent activity</p><h2>Keep an eye on the details.</h2></div><a className="text-link" href="#transactions" onClick={() => onNavigate('transactions')}>See all <Icon name="arrow" size={15} /></a></div><div className="content-grid"><section className="panel activity-panel"><div className="panel-heading"><div><h2>Latest entries</h2><p>Small details, no clutter.</p></div><span className="panel-count">{entries.length}</span></div>{entries.slice(0, 5).map((entry) => <ActivityRow key={entry.id} entry={entry} currency={currency} />)}</section><section className="panel next-panel"><div className="next-panel-icon"><Icon name="commitments" size={20} /></div><p className="eyebrow">Next up</p><h2>{commitments.length > 0 ? 'Your commitments are visible.' : 'Make room for future you.'}</h2><p>{commitments.length > 0 ? 'Planned payments are separated from actual spending so your available balance stays honest.' : 'SIPs, RDs, and recurring obligations will live here, beside what you have actually spent.'}</p><Button variant="secondary" onClick={() => onNavigate('commitments')} icon="arrow">View commitments</Button></section></div></>}</>
}

function TransactionsView({ dataset, onSeed, onNavigate, onNotice }: { dataset: Dataset | null; onSeed: () => void; onNavigate: (route: Route) => void; onNotice: (notice: Notice) => void }) {
  const entries = dataset?.entries ?? []
  const currency = dataset?.currency ?? 'INR'
  return <><PageHeading eyebrow="Workspace / Transactions" title="Transactions" description="Every debit and credit in one calm, chronological view." action={<Button variant="primary" icon="plus" onClick={() => onNotice({ tone: 'info', text: 'Transaction entry will land in the next ledger slice. The list and empty state are ready.' })}>Add transaction</Button>} />{entries.length === 0 ? <section className="panel"><EmptyState icon="transactions" eyebrow="No entries yet" title="Your ledger is quiet." description="When you add income or spending, it will appear here with a date, category, and clear effect on your balance." primaryLabel="Load synthetic workspace" onPrimary={onSeed} secondaryLabel="Back to overview" onSecondary={() => onNavigate('home')} /></section> : <section className="panel table-panel"><div className="table-toolbar"><div><h2>All entries</h2><p>{entries.length} records in your local ledger</p></div><Button variant="quiet" icon="refresh" onClick={() => onNotice({ tone: 'success', text: 'This shell is ready for live refresh as the ledger flow is added.' })}>Refresh</Button></div><div className="transaction-list">{entries.map((entry) => <ActivityRow key={entry.id} entry={entry} currency={currency} />)}</div></section>}</>
}

function InsightsView({ dataset, onSeed, onNavigate }: { dataset: Dataset | null; onSeed: () => void; onNavigate: (route: Route) => void }) {
  const entries = dataset?.entries ?? []
  const hasEnoughData = entries.length >= 2
  const currency = dataset?.currency ?? 'INR'
  const expenseTotal = entries.filter((entry) => entry.status === 'active' && entry.type === 'expense').reduce((total, entry) => total + entry.amountMinor, 0)
  return <><PageHeading eyebrow="Workspace / Insights" title="Insights" description="Patterns should make decisions easier, not make the screen busier." />{!hasEnoughData ? <section className="panel"><EmptyState icon="insights" eyebrow="A little data goes a long way" title="Insights need a few entries." description="Once you have more than one active transaction, this space will help you spot weekly rhythms, category concentration, and changes in your spending." primaryLabel="Load synthetic workspace" onPrimary={onSeed} secondaryLabel="Review transactions" onSecondary={() => onNavigate('transactions')} /></section> : <div className="insight-grid"><section className="panel insight-feature"><div className="panel-heading"><div><p className="card-label">This month</p><h2>Spend at a glance</h2></div><div className="panel-mark panel-mark-teal"><Icon name="insights" size={18} /></div></div><strong className="insight-value">{money(expenseTotal, currency)}</strong><p className="insight-copy">A focused view of spending will appear here as categories and periods become meaningful.</p><div className="insight-bars"><span style={{ height: '42%' }} /><span style={{ height: '64%' }} /><span style={{ height: '51%' }} /><span style={{ height: '78%' }} /><span style={{ height: '58%' }} /><span style={{ height: '88%' }} /><span style={{ height: '69%' }} /></div></section><section className="panel insight-note"><div className="next-panel-icon teal-fill"><Icon name="spark" size={20} /></div><p className="eyebrow">Design principle</p><h2>Useful density, not dashboard clutter.</h2><p>Charts will earn their place by answering a question about your money. They will not exist just to decorate the home screen.</p></section></div>}</>
}

function CommitmentsView({ dataset, onSeed, onNavigate, onNotice }: { dataset: Dataset | null; onSeed: () => void; onNavigate: (route: Route) => void; onNotice: (notice: Notice) => void }) {
  const commitments = dataset?.commitments ?? []
  const currency = dataset?.currency ?? 'INR'
  return <><PageHeading eyebrow="Workspace / Commitments" title="Commitments" description="See what is already spoken for before you decide what is available." action={<Button variant="primary" icon="plus" onClick={() => onNotice({ tone: 'info', text: 'Commitment entry will follow the domain flow. This surface is ready for it.' })}>Add commitment</Button>} />{commitments.length === 0 ? <section className="panel"><EmptyState icon="commitments" eyebrow="Nothing planned yet" title="Leave room for future commitments." description="SIPs, RDs, subscriptions, and recurring obligations will be kept separate from the transactions you have already made." primaryLabel="Load synthetic workspace" onPrimary={onSeed} secondaryLabel="Back to overview" onSecondary={() => onNavigate('home')} /></section> : <section className="panel table-panel"><div className="table-toolbar"><div><h2>Planned commitments</h2><p>{commitments.length} planned items in your local workspace</p></div></div><div className="commitment-list">{commitments.map((item) => <div className="commitment-row" key={item.id}><div className="activity-icon activity-icon-teal"><Icon name="commitments" size={16} /></div><div className="activity-copy"><strong>{item.name}</strong><span>{item.kind} · due {shortDate(item.dueOn)}</span></div><div className="commitment-amount"><strong>{money(item.plannedAmountMinor, currency)}</strong><span>{item.status}</span></div><Icon name="chevron" size={16} /></div>)}</div></section>}</>
}

function SettingsView({ health, onSeed, onExport, onImportClick, onReset }: { health: Health | null; onSeed: () => void; onExport: () => void; onImportClick: () => void; onReset: () => void }) {
  return <><PageHeading eyebrow="Workspace / Settings" title="Settings" description="Keep the local setup understandable, portable, and easy to recover." /><div className="settings-grid"><section className="panel settings-card"><div className="panel-heading"><div><p className="card-label">Storage</p><h2>Local by default.</h2></div><div className="panel-mark"><Icon name="wallet" size={18} /></div></div><p>Your primary ledger lives in a SQLite file on this computer, outside browser storage. Clearing browser data or switching browsers does not remove it.</p><dl className="settings-details"><div><dt>Connection</dt><dd><span className="status-dot status-dot-online" />{health ? 'Connected' : 'Unavailable'}</dd></div><div><dt>Storage mode</dt><dd>{health?.storage ?? 'SQLite'}</dd></div><div><dt>Database file</dt><dd>{health?.databaseFile ?? 'OS application data directory'}</dd></div></dl></section><section className="panel settings-card"><div className="panel-heading"><div><p className="card-label">Backup</p><h2>Keep a copy you control.</h2></div><div className="panel-mark panel-mark-teal"><Icon name="download" size={18} /></div></div><p>JSON is the lossless backup format. Download it to another drive or import it on another machine when needed.</p><div className="settings-actions"><Button variant="primary" icon="download" onClick={onExport}>Export JSON backup</Button><Button variant="secondary" icon="upload" onClick={onImportClick}>Import JSON backup</Button></div></section><section className="panel settings-card settings-card-wide"><div className="panel-heading"><div><p className="card-label">Workspace tools</p><h2>Synthetic data and reset</h2></div><div className="panel-mark"><Icon name="settings" size={18} /></div></div><p>Use synthetic records to explore the product safely. Reset removes Margin records only; it does not touch downloaded backups or unrelated files.</p><div className="settings-actions"><Button variant="secondary" icon="spark" onClick={onSeed}>Load synthetic data</Button><Button variant="danger" icon="reset" onClick={onReset}>Reset local records</Button></div></section></div></>
}

function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const importInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleHashChange = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  async function refresh() {
    setLoading(true)
    try {
      const [nextHealth, nextDataset] = await Promise.all([request<Health>('/api/health'), request<Dataset>('/api/dataset')])
      setHealth(nextHealth)
      setDataset(nextDataset)
    } catch (reason) {
      setNotice({ tone: 'error', text: reason instanceof Error ? reason.message : 'Unable to reach the local Margin service.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  function navigate(nextRoute: Route) {
    window.location.hash = nextRoute === 'home' ? '' : nextRoute
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
      const summary = await request<BackupSummary>('/api/backup/validate', { method: 'POST', body: JSON.stringify(backup) })
      const countLabel = Object.entries(summary.counts).map(([collection, count]) => `${count} ${collection}`).join(', ')
      const warningLabel = summary.warnings.length > 0 ? `\n\nNote: ${summary.warnings.join(' ')}` : ''
      if (!window.confirm(`Restore the ${summary.currency} backup from ${summary.exportedAt.slice(0, 10)}?\n\n${countLabel}.\n\nThis replaces the current local dataset. A recovery snapshot will be created first.${warningLabel}`)) return
      await request<{ summary: BackupSummary }>('/api/backup/restore', { method: 'POST', body: JSON.stringify(backup) })
      setNotice({ tone: 'success', text: 'Backup restored successfully. A pre-restore recovery snapshot was saved locally.' })
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

  return <div className="app-shell"><aside className="sidebar"><a className="brand" href="#" onClick={() => navigate('home')}><span className="brand-mark">M</span><span><strong>Margin</strong><small>Personal finance, locally.</small></span></a><div className="sidebar-group"><span className="sidebar-label">Workspace</span><nav aria-label="Primary navigation">{navigation.map((item) => <NavLink key={item.key} item={item} active={item.key === route} onNavigate={navigate} />)}</nav></div><div className="sidebar-footer"><div className="storage-pill"><span className="status-dot status-dot-online" /><span><strong>Local workspace</strong><small>{health ? 'Connected and private' : 'Connecting…'}</small></span></div><div className="sidebar-footnote"><span className="teal-tick" />No cloud account required</div></div></aside><div className="app-main"><header className="topbar"><div className="mobile-brand"><span className="brand-mark">M</span><strong>Margin</strong></div><div className="topbar-context"><span className="topbar-section">{activeNavigation.label}</span><span className="topbar-separator">/</span><span>{activeNavigation.description}</span></div><div className="topbar-actions"><span className="connection-label"><span className="status-dot status-dot-online" />Local only</span><a className="icon-button" href="#settings" aria-label="Open settings" onClick={() => navigate('settings')}><Icon name="settings" size={18} /></a></div></header><main className="content" id="main-content">{notice && <div className={`notice notice-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}><span>{notice.text}</span><button type="button" className="notice-close" aria-label="Dismiss notice" onClick={() => setNotice(null)}>×</button></div>}{loading && !dataset ? <section className="panel loading-panel"><span className="status-dot status-dot-teal" />Connecting to your local workspace…</section> : route === 'home' ? <HomeView dataset={dataset} health={health} onSeed={() => void seedSyntheticData()} onNavigate={navigate} onNotice={setNotice} /> : route === 'transactions' ? <TransactionsView dataset={dataset} onSeed={() => void seedSyntheticData()} onNavigate={navigate} onNotice={setNotice} /> : route === 'insights' ? <InsightsView dataset={dataset} onSeed={() => void seedSyntheticData()} onNavigate={navigate} /> : route === 'commitments' ? <CommitmentsView dataset={dataset} onSeed={() => void seedSyntheticData()} onNavigate={navigate} onNotice={setNotice} /> : <SettingsView health={health} onSeed={() => void seedSyntheticData()} onExport={() => void exportBackup()} onImportClick={() => importInput.current?.click()} onReset={() => void resetData()} />}</main><nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map((item) => <NavLink key={item.key} item={item} active={item.key === route} onNavigate={navigate} />)}</nav></div><input ref={importInput} type="file" accept="application/json,.json" hidden onChange={(event) => void importBackup(event)} /></div>
}

export default App
