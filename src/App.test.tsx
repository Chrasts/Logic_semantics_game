// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

describe('sandbox user interface', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('adds a world and can undo the change', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getAllByLabelText('World')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: '+ Add world' }))
    expect(screen.getAllByLabelText('World')).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getAllByLabelText('World')).toHaveLength(2)
  })

  it('locks construction controls in Evaluate mode', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Evaluate' }))
    expect(screen.getByRole('button', { name: '+ Add world' })).toBeDisabled()
    for (const input of screen.getAllByLabelText('World')) expect(input).toBeDisabled()
  })

  it('enables global frame properties and reports derived edges', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^Frame rules/ }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Reflexive rule mode' }), 'enforce')
    expect(screen.getByRole('combobox', { name: 'Reflexive rule mode' })).toHaveValue('enforce')
    expect(screen.getByText(/2 edges derived from frame properties/)).toBeVisible()
  })

  it('shows a parser error for an empty formula', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.clear(screen.getByLabelText('Modal formula'))
    await user.click(screen.getByRole('button', { name: 'Verify model' }))
    expect(screen.getByText(/Expected a formula, but the input ended/)).toBeVisible()
  })

  it('checks all valuations and returns a frame counterexample', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText('Evaluation scope'), 'frame')
    await user.click(screen.getByRole('button', { name: 'Verify model' }))
    expect(screen.getByText(/the formula is not valid on this frame/i)).toBeVisible()
    expect(screen.getByText(/Countervaluation found/)).toBeVisible()
  })

  it('loads a modal correspondence preset', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText('Correspondence lab'), 't')
    expect(screen.getByLabelText('Modal formula')).toHaveValue('□p → p')
    expect(screen.getByLabelText('Evaluation scope')).toHaveValue('frame')
  })
})
