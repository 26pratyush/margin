import { CSSProperties, useEffect, useState } from 'react'

type WorkflowStep = {
  eyebrow: string
  title: string
  description: string
  value: string
  note: string
}

const workflowSteps: WorkflowStep[] = [
  {
    eyebrow: '01 / Income',
    title: 'Start with what actually came in.',
    description: 'Record a real salary receipt with its pay date, then let the rest of the picture build from there.',
    value: '₹100,000',
    note: 'recorded income',
  },
  {
    eyebrow: '02 / Spending',
    title: 'Keep the important spending visible.',
    description: 'Add an expense with a category and date. The dashboard updates in place, without losing your place.',
    value: '₹78,750',
    note: 'actual balance',
  },
  {
    eyebrow: '03 / Commitments',
    title: 'Separate plans from money already gone.',
    description:
      'SIPs, bills, and future obligations reserve money without pretending they have already left your account.',
    value: '₹68,750',
    note: 'after commitments',
  },
  {
    eyebrow: '04 / Margin',
    title: 'See the number you can actually use.',
    description:
      'Margin gives you a calm answer to a practical question: what is still available after the things that matter?',
    value: '₹68,750',
    note: 'disposable balance',
  },
]

const principles = [
  {
    title: 'Clear before clever.',
    description: 'Every screen should explain what changed, what is reserved, and what action makes sense next.',
  },
  {
    title: 'Calm density.',
    description: 'Margin keeps enough detail to be useful without turning your money into a wall of competing cards.',
  },
  {
    title: 'Local by default.',
    description:
      'Your primary ledger lives on your computer. JSON export makes the data portable when you need it elsewhere.',
  },
  {
    title: 'Recovery should be understandable.',
    description: 'Backups, restores, and reset actions are explicit. There is no mysterious cloud state to hunt down.',
  },
]

const screenshotSources = [
  {
    filename: 'overview.png',
    eyebrow: 'The overview',
    title: 'A quieter answer to “what remains?”',
    description: 'Income, spending, commitments, and disposable balance in one considered view.',
    variant: 'overview' as const,
  },
  {
    filename: 'transactions.png',
    eyebrow: 'The ledger',
    title: 'Details when they earn their place.',
    description: 'Add a record in a few fields, then return to the full picture without a page reload.',
    variant: 'transactions' as const,
  },
  {
    filename: 'settings.png',
    eyebrow: 'The boundary',
    title: 'Private does not have to mean opaque.',
    description: 'Local storage and JSON backup are visible, understandable parts of the product.',
    variant: 'settings' as const,
  },
]

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M4 10h11M10.5 4.5 16 10l-5.5 5.5" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M11 4h5v5M16 4l-7 7" />
      <path d="M15 11v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" />
    </svg>
  )
}

function MarginMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`margin-mark ${small ? 'margin-mark-small' : ''}`} aria-hidden="true">
      M
    </span>
  )
}

function ProductMock({ variant }: { variant: 'overview' | 'transactions' | 'settings' }) {
  if (variant === 'transactions') {
    return (
      <div className="product-mock product-mock-transactions">
        <div className="mock-topline">
          <span className="mock-kicker">Workspace / Transactions</span>
          <span className="mock-connection">
            <i /> Local only
          </span>
        </div>
        <div className="mock-heading-row">
          <div>
            <span className="mock-label">Transactions</span>
            <strong>Every debit and credit.</strong>
          </div>
          <span className="mock-button">+ Add transaction</span>
        </div>
        <div className="mock-form">
          <div className="mock-form-tabs">
            <span className="mock-tab-active">Salary</span>
            <span>Expense</span>
          </div>
          <div className="mock-form-grid">
            <span>
              <small>Amount</small>
              <b>₹1,250</b>
            </span>
            <span>
              <small>Date</small>
              <b>21 Aug 2026</b>
            </span>
            <span>
              <small>Category</small>
              <b>Living</b>
            </span>
          </div>
          <div className="mock-form-footer">
            <span>Keep the important details clear.</span>
            <b>Save expense</b>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'settings') {
    return (
      <div className="product-mock product-mock-settings">
        <div className="mock-topline">
          <span className="mock-kicker">Workspace / Settings</span>
          <span className="mock-connection">
            <i /> Connected
          </span>
        </div>
        <div className="mock-heading-row mock-heading-row-compact">
          <div>
            <span className="mock-label">Storage</span>
            <strong>Local by default.</strong>
          </div>
          <span className="mock-mark">↗</span>
        </div>
        <p className="mock-copy">
          Your primary ledger lives in a SQLite file on this computer, outside browser storage.
        </p>
        <div className="mock-detail-list">
          <span>
            <small>Storage mode</small>
            <b>SQLite</b>
          </span>
          <span>
            <small>Backup</small>
            <b>JSON / lossless</b>
          </span>
          <span>
            <small>Cloud account</small>
            <b>Not required</b>
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="product-mock product-mock-overview">
      <div className="mock-topline">
        <span className="mock-kicker">Workspace / Overview</span>
        <span className="mock-connection">
          <i /> Local workspace
        </span>
      </div>
      <div className="mock-overview-grid">
        <div className="mock-balance">
          <div className="mock-balance-top">
            <span>Actual balance</span>
            <b>Current workspace</b>
          </div>
          <strong>₹78,750</strong>
          <p>Calculated from active local records. Planned commitments are reserved separately.</p>
          <div className="mock-bars">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="mock-balance-foot">
            <span>
              <i /> Local and private
            </span>
            <b>Review activity →</b>
          </div>
        </div>
        <div className="mock-metrics">
          <span>
            <small>Recorded income</small>
            <b>₹100,000</b>
          </span>
          <span>
            <small>Recorded spending</small>
            <b>₹21,250</b>
          </span>
          <span className="mock-metric-accent">
            <small>Disposable balance</small>
            <b>₹68,750</b>
          </span>
          <span>
            <small>Ledger entries</small>
            <b>2</b>
          </span>
        </div>
      </div>
    </div>
  )
}

function ScreenshotFrame({
  filename,
  variant,
}: {
  filename: string
  variant: 'overview' | 'transactions' | 'settings'
}) {
  const [missing, setMissing] = useState(false)
  const source = `${import.meta.env.BASE_URL}screenshots/${filename}`

  return (
    <div className={`screenshot-frame ${missing ? 'screenshot-frame-missing' : ''}`}>
      <div className="screenshot-chrome">
        <span />
        <span />
        <span />
        <small>margin / local workspace</small>
      </div>
      {missing ? <ProductMock variant={variant} /> : <img src={source} alt="" onError={() => setMissing(true)} />}
    </div>
  )
}

function App() {
  const [activeStep, setActiveStep] = useState(0)
  const [openPrinciple, setOpenPrinciple] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(motionQuery.matches)
    updateMotion()
    motionQuery.addEventListener('change', updateMotion)
    return () => motionQuery.removeEventListener('change', updateMotion)
  }, [])

  useEffect(() => {
    let frame = 0
    const handleScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        const current = window.scrollY
        setScrolled(current > 24)
        setScrollProgress(Math.min(current / 720, 1))
        frame = 0
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const steps = Array.from(document.querySelectorAll<HTMLElement>('[data-workflow-step]'))
    if (steps.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0]
        if (visible) setActiveStep(Number((visible.target as HTMLElement).dataset.workflowStep ?? 0))
      },
      { rootMargin: '-35% 0px -35% 0px', threshold: [0.2, 0.5, 0.8] },
    )
    steps.forEach((step) => observer.observe(step))
    return () => observer.disconnect()
  }, [])

  const heroStyle = {
    '--hero-progress': scrollProgress,
    '--hero-scale': 1 - scrollProgress * 0.08,
    '--hero-y': `${scrollProgress * -18}px`,
  } as CSSProperties

  return (
    <div className={`site ${reducedMotion ? 'site-reduced-motion' : ''}`} id="top">
      <header className={`site-header ${scrolled ? 'site-header-scrolled' : ''}`}>
        <a className="site-wordmark" href="#top" aria-label="Margin home">
          <MarginMark small />
          <span>Margin</span>
        </a>
        <nav className="site-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#local-first">Local-first</a>
          <a href="#principles">Principles</a>
        </nav>
        <a className="site-header-link" href="https://github.com/26pratyush/margin" target="_blank" rel="noreferrer">
          View source <ExternalIcon />
        </a>
      </header>

      <main>
        <section className="hero section-shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow eyebrow-accent">
              <span className="eyebrow-dot" /> Personal finance, locally.
            </p>
            <h1 id="hero-title">
              Make room for <em>what remains.</em>
            </h1>
            <p className="hero-lede">
              Margin brings income, spending, and commitments into one quiet view—so the number you can actually use is
              never hidden.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#how-it-works">
                See how it works <ArrowIcon />
              </a>
              <a
                className="button button-quiet"
                href="https://github.com/26pratyush/margin#local-setup"
                target="_blank"
                rel="noreferrer"
              >
                Run it locally <ExternalIcon />
              </a>
            </div>
            <p className="hero-note">No account. No cloud ledger. Just a clearer margin.</p>
          </div>
          <div className="hero-stage" style={heroStyle} aria-label="Synthetic Margin overview preview">
            <div className="hero-aura" />
            <div className="hero-window">
              <div className="window-chrome">
                <span />
                <span />
                <span />
                <small>margin / overview</small>
              </div>
              <ProductMock variant="overview" />
            </div>
            <div className="hero-float hero-float-top">
              <span className="float-dot" /> Local workspace
            </div>
            <div className="hero-float hero-float-bottom">
              <small>after commitments</small>
              <strong>₹68,750</strong>
            </div>
          </div>
        </section>

        <section className="manifesto section-shell" aria-labelledby="manifesto-title">
          <div className="section-rule" />
          <p className="eyebrow">The space between</p>
          <h2 id="manifesto-title">
            Most money apps tell you what happened. Margin helps you decide what is still possible.
          </h2>
          <div className="manifesto-footer">
            <p>
              It is designed for the first salary, the important expenses, and the quiet decisions that happen between
              them.
            </p>
            <span className="manifesto-mark">
              <MarginMark />
            </span>
          </div>
        </section>

        <section className="workflow section-shell" id="how-it-works" aria-labelledby="workflow-title">
          <div className="section-intro">
            <p className="eyebrow">A small, useful loop</p>
            <h2 id="workflow-title">Follow the money without losing the thread.</h2>
            <p>
              Margin keeps actual money movement and future commitments distinct, then brings them back together at the
              moment you need an answer.
            </p>
          </div>
          <div className="workflow-layout">
            <div className="workflow-copy">
              {workflowSteps.map((step, index) => (
                <article
                  className={`workflow-step ${activeStep === index ? 'workflow-step-active' : ''}`}
                  data-workflow-step={index}
                  data-testid="workflow-step"
                  key={step.eyebrow}
                >
                  <span className="step-index">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="eyebrow">{step.eyebrow}</p>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="workflow-preview" aria-live="polite" data-testid="workflow-preview">
              <div className="workflow-preview-sticky">
                <div className="preview-topline">
                  <span>
                    <i /> Synthetic workspace
                  </span>
                  <span>{String(activeStep + 1).padStart(2, '0')} / 04</span>
                </div>
                <div className="preview-balance">
                  <small>{workflowSteps[activeStep].note}</small>
                  <strong>{workflowSteps[activeStep].value}</strong>
                  <div className="preview-line">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
                <div className="preview-detail">
                  <span>{workflowSteps[activeStep].eyebrow.replace(/\d+ \/ /, '')}</span>
                  <b>
                    {activeStep === 0
                      ? '+ ₹100,000'
                      : activeStep === 1
                        ? '− ₹21,250'
                        : activeStep === 2
                          ? '− ₹10,000'
                          : '₹68,750'}
                  </b>
                </div>
                <div className="preview-foot">
                  <span>local and private</span>
                  <span className="preview-teal">margin</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="surfaces section-shell" aria-labelledby="surfaces-title">
          <div className="section-intro section-intro-wide">
            <p className="eyebrow">The product</p>
            <h2 id="surfaces-title">Useful density, not dashboard theatre.</h2>
            <p>
              The interface earns its quietness through clear hierarchy, not by hiding detail. Here are a few of the
              surfaces that make the loop feel real.
            </p>
          </div>
          <div className="surface-grid">
            {screenshotSources.map((screenshot, index) => (
              <figure className={`surface-card surface-card-${index + 1}`} key={screenshot.filename}>
                <ScreenshotFrame filename={screenshot.filename} variant={screenshot.variant} />
                <figcaption>
                  <p className="eyebrow">{screenshot.eyebrow}</p>
                  <h3>{screenshot.title}</h3>
                  <p>{screenshot.description}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="local-first section-shell" id="local-first" aria-labelledby="local-title">
          <div className="local-copy">
            <p className="eyebrow eyebrow-teal">The boundary matters</p>
            <h2 id="local-title">Private by default. Portable when you need it.</h2>
            <p>
              Margin runs on your computer. The browser is the interface, not the database. A versioned JSON backup
              gives you a clear way to move or recover your data.
            </p>
            <a
              className="text-link"
              href="https://github.com/26pratyush/margin/blob/main/docs/LOCAL_DATA.md"
              target="_blank"
              rel="noreferrer"
            >
              Read the data boundary <ArrowIcon />
            </a>
          </div>
          <div className="architecture" aria-label="Margin local-first architecture">
            <div className="architecture-line">
              <i />
              <i />
              <i />
            </div>
            <div className="architecture-node">
              <span className="node-number">01</span>
              <strong>Browser</strong>
              <small>your interface</small>
            </div>
            <div className="architecture-node architecture-node-active">
              <span className="node-number">02</span>
              <strong>Loopback service</strong>
              <small>your computer</small>
            </div>
            <div className="architecture-node">
              <span className="node-number">03</span>
              <strong>SQLite + JSON</strong>
              <small>your records</small>
            </div>
          </div>
        </section>

        <section className="principles section-shell" id="principles" aria-labelledby="principles-title">
          <div className="principles-heading">
            <p className="eyebrow">The design language</p>
            <h2 id="principles-title">Calm is a product decision.</h2>
            <p>Margin is intentionally opinionated about what deserves attention.</p>
          </div>
          <div className="principles-list">
            {principles.map((principle, index) => {
              const open = openPrinciple === index
              return (
                <div className={`principle ${open ? 'principle-open' : ''}`} key={principle.title}>
                  <button type="button" aria-expanded={open} onClick={() => setOpenPrinciple(open ? -1 : index)}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{principle.title}</strong>
                    <i aria-hidden="true">{open ? '−' : '+'}</i>
                  </button>
                  <div className="principle-content" hidden={!open}>
                    <p>{principle.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="closing section-shell" aria-labelledby="closing-title">
          <div className="closing-mark">
            <MarginMark />
          </div>
          <p className="eyebrow eyebrow-accent">Start with the next useful number.</p>
          <h2 id="closing-title">Your money does not need more noise.</h2>
          <p>It needs a place to make sense.</p>
          <div className="hero-actions closing-actions">
            <a
              className="button button-primary"
              href="https://github.com/26pratyush/margin#local-setup"
              target="_blank"
              rel="noreferrer"
            >
              Run Margin locally <ExternalIcon />
            </a>
            <a
              className="button button-quiet"
              href="https://github.com/26pratyush/margin"
              target="_blank"
              rel="noreferrer"
            >
              Explore the repository <ArrowIcon />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer section-shell">
        <a className="site-wordmark" href="#top">
          <MarginMark small />
          <span>Margin</span>
        </a>
        <span>Personal finance, locally.</span>
        <div>
          <a href="https://github.com/26pratyush/margin" target="_blank" rel="noreferrer">
            GitHub <ExternalIcon />
          </a>
          <a
            href="https://github.com/26pratyush/margin/blob/main/docs/ARCHITECTURE.md"
            target="_blank"
            rel="noreferrer"
          >
            Architecture <ExternalIcon />
          </a>
        </div>
      </footer>
    </div>
  )
}

export default App
