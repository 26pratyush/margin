import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Margin product site', () => {
  it('presents the product story and local-first calls to action', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /make room for what remains/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /run it locally/i })).toHaveAttribute(
      'href',
      'https://github.com/26pratyush/margin#local-setup',
    )
    expect(screen.getByRole('heading', { name: /private by default/i })).toBeInTheDocument()
    expect(screen.getByText('The monthly locker.', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText(/Copyright © 2026 Pratyush/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /v0\.1\.0 notes/i })).toHaveAttribute(
      'href',
      'https://github.com/26pratyush/margin/blob/main/docs/RELEASE-v0.1.0.md',
    )
    expect(screen.getByRole('link', { name: /license/i })).toHaveAttribute(
      'href',
      'https://github.com/26pratyush/margin/blob/main/LICENSE',
    )
  })

  it('expands a design principle without adding another interactive surface', () => {
    render(<App />)
    const principle = screen.getByRole('button', { name: /clear before clever/i })

    expect(principle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(principle)
    expect(principle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText(/every screen should explain/i)).not.toBeVisible()
  })

  it('keeps the five-step workflow tied to one dynamic preview', () => {
    render(<App />)

    expect(screen.getAllByTestId('workflow-step')).toHaveLength(5)
    expect(screen.getAllByTestId('workflow-preview')).toHaveLength(1)
    expect(screen.getByTestId('workflow-preview')).toHaveAttribute('aria-live', 'polite')
    expect(within(screen.getByTestId('workflow-preview')).getByText(/recorded income/i)).toBeInTheDocument()
    expect(within(screen.getByTestId('workflow-preview')).getByText('01 / 05')).toBeInTheDocument()
  })
})
