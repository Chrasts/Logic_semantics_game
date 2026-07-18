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

    await user.click(screen.getByRole('button', { name: /^Constraints/ }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Reflexive rule mode' }), 'enforce')
    expect(screen.getByRole('combobox', { name: 'Reflexive rule mode' })).toHaveValue('enforce')
    expect(screen.getByText(/2 edges derived from frame properties/)).toBeVisible()
  })

  it('shows a parser error for an empty formula', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.clear(screen.getByLabelText('Modal formula'))
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    expect(screen.getByText(/Expected a formula, but the input ended/)).toBeVisible()
  })

  it('checks all valuations and returns a frame counterexample', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText('Semantic target'), 'frame')
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    expect(screen.getByText('Not valid on this frame.')).toBeVisible()
    expect(screen.getByText(/Countervaluation at/)).toBeVisible()
  })

  it('loads a modal correspondence preset', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText('Correspondence lab'), 't')
    expect(screen.getByLabelText('Modal formula')).toHaveValue('□p → p')
    expect(screen.getByLabelText('Semantic target')).toHaveValue('correspondence')
  })

  it('reports formula, relation, and correspondence verdicts separately', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText('Correspondence lab'), 't')
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    expect(screen.getByText('Correspondence confirmed on this frame')).toBeVisible()
    expect(screen.getByText('Frame validity')).toBeVisible()
    expect(screen.getByText('Relational property')).toBeVisible()
    expect(screen.getByText('Instance comparison')).toBeVisible()
  })

  it('selects a remaining evaluation world after deleting the current one', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Delete world w0' }))
    expect(screen.getByLabelText('Evaluation world')).toHaveValue('w1')
  })

  it('closes an open dialog with Escape', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Controls' }))
    expect(screen.getByRole('dialog', { name: 'Guide' })).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Guide' })).not.toBeInTheDocument()
  })

  it('runs the first tutorial level and unlocks progression', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Tutorial' }))
    await user.click(screen.getByRole('button', { name: 'Start tutorial' }))
    expect(screen.getByText('Make p true at the evaluation world.')).toBeVisible()
    expect(screen.getByLabelText('Modal formula')).toBeDisabled()
    expect(screen.getAllByLabelText('World')[0]).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Evaluation world'), 'w1')
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))

    expect(screen.getByText('Complete')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Next level' })).toBeEnabled()
  })

  it('restores the sandbox after leaving campaign mode', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.clear(screen.getByLabelText('Modal formula'))
    await user.type(screen.getByLabelText('Modal formula'), 'box q')
    await user.click(screen.getByRole('button', { name: 'Campaigns' }))
    await user.click(screen.getByRole('button', { name: 'Start campaign' }))
    await user.click(screen.getByRole('button', { name: 'Sandbox' }))

    expect(screen.getByLabelText('Modal formula')).toHaveValue('box q')
  })

  it('switches between campaign tracks and loads their objectives', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Campaigns' }))
    expect(screen.getByText('Necessary, not actual')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Global Model Building/ }))
    expect(screen.getByText('Persistence of truth')).toBeVisible()
  })

  it('requires the tutorial frame rule to be globally enforced', async () => {
    localStorage.setItem('logic-game:campaign-progress:v1', JSON.stringify([
      'tutorial-evaluation', 'tutorial-add-world', 'tutorial-valuation', 'tutorial-add-relation', 'tutorial-remove-relation', 'tutorial-global-model',
    ]))
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Tutorial' }))
    await user.click(screen.getByRole('button', { name: 'Continue tutorial' }))
    expect(screen.getByText('Frames and global constraints')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /^Constraints/ }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Reflexive rule mode' }), 'enforce')
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    expect(screen.getByText('Complete')).toBeVisible()
  })

  it('opens the formal modal logic introduction', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Guide' }))
    await user.click(screen.getByRole('tab', { name: 'Modal logic' }))
    expect(screen.getByRole('heading', { name: 'Guide' })).toBeVisible()
    expect(screen.getByText(/M = ⟨W,R,ν⟩/)).toBeVisible()
    expect(screen.getByText(/M,w ⊨ φ states truth at w/)).toBeVisible()
  })

  it('documents objective and constraint types in the guide', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Guide' }))
    await user.click(screen.getByRole('tab', { name: 'Objectives & constraints' }))
    expect(screen.getByText('Objective scopes')).toBeVisible()
    expect(screen.getByText('Construction constraints')).toBeVisible()
    expect(screen.getByText('Locked inputs')).toBeVisible()
  })
})
