import { fireEvent, render, screen } from '@testing-library/react'
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
  })

  it('expands a design principle without adding another interactive surface', () => {
    render(<App />)
    const principle = screen.getByRole('button', { name: /clear before clever/i })

    expect(principle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(principle)
    expect(principle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText(/every screen should explain/i)).not.toBeVisible()
  })
})
