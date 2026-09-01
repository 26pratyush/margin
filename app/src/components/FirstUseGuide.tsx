import { useEffect, useRef } from 'react'

const guideItems = [
  {
    title: 'Salary',
    description: 'Money that has actually arrived and belongs in your local ledger.',
  },
  {
    title: 'Expenses',
    description: 'Everyday debits and credits that change your actual balance.',
  },
  {
    title: 'Planning',
    description: 'A monthly view that keeps expected salary separate from real cash.',
  },
  {
    title: 'Reserved',
    description: 'Commitments held aside for later without pretending they are spent.',
  },
  {
    title: 'Disposable',
    description: 'What remains after actual balance and planned commitments are considered.',
  },
]

export function FirstUseGuide({ onTryDemo, onDismiss }: { onTryDemo: () => void; onDismiss: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section className="panel first-use-guide" aria-labelledby="first-use-guide-title">
      <div className="first-use-guide-heading">
        <div>
          <p className="card-label">Getting started</p>
          <h2 id="first-use-guide-title" ref={headingRef} tabIndex={-1}>
            See how Margin keeps money clear.
          </h2>
          <p>
            A short tour of the planning loop before you add real financial data. You can skip this and reopen it from
            Settings whenever you want a refresher.
          </p>
        </div>
        <button type="button" className="notice-close" aria-label="Skip getting started guide" onClick={onDismiss}>
          ×
        </button>
      </div>
      <div className="first-use-guide-items">
        {guideItems.map((item) => (
          <article key={item.title} className="first-use-guide-item">
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
      <div className="form-actions first-use-guide-actions">
        <button type="button" className="button button-primary" onClick={onTryDemo}>
          Try synthetic data
        </button>
        <button type="button" className="button button-quiet" onClick={onDismiss}>
          Skip guide
        </button>
      </div>
    </section>
  )
}
