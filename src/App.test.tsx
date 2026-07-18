// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

describe('sandbox user interface', () => {
  it('links to the game repository', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: 'Logic Model Builder repository on GitHub' })).toHaveAttribute('href', 'https://github.com/Chrasts/Logic_semantics_game')
  })

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
    expect(screen.getByText('Evaluation tree')).toBeVisible()
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
    expect(screen.getByText('Formula and relation agree on this frame')).toBeVisible()
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
    expect(screen.getByText('Make p true at w0.')).toBeVisible()
    expect(screen.getByText(/Read and edit the valuation/)).toBeVisible()
    expect(screen.getByLabelText('Modal formula')).toBeDisabled()
    expect(screen.getAllByLabelText('World')[0]).toBeDisabled()

    await user.type(screen.getAllByLabelText('True atoms')[0], 'p')
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))

    expect(screen.getByText('Complete')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Next level' })).toBeEnabled()
    expect(screen.getByRole('dialog', { name: 'Mission complete' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Next mission' }))
    expect(screen.getByText('Make p true at the evaluation world.')).toBeVisible()
    expect(screen.queryByRole('dialog', { name: 'Mission complete' })).not.toBeInTheDocument()
  })

  it('persists completed tutorial steps across application reloads', async () => {
    const user = userEvent.setup()
    const view = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Tutorial' }))
    await user.click(screen.getByRole('button', { name: 'Start tutorial' }))
    await user.type(screen.getAllByLabelText('True atoms')[0], 'p')
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    view.unmount()

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Tutorial' }))
    expect(screen.getByLabelText('1 of 13 tutorial steps complete')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue tutorial' })).toBeVisible()
  })

  it('requires and evaluates a prediction in the nested-modality tutorial', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Tutorial' }))
    await user.click(screen.getAllByRole('button', { name: 'Play' })[6])
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    expect(screen.getByText('Make a prediction first')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '+ Add edge' }))
    await user.selectOptions(screen.getAllByLabelText('Edge target world')[0], 'w1')
    await user.click(screen.getByRole('button', { name: '+ Add edge' }))
    await user.selectOptions(screen.getAllByLabelText('Edge source world')[1], 'w1')
    await user.selectOptions(screen.getAllByLabelText('Edge target world')[1], 'w2')
    await user.click(screen.getByRole('button', { name: 'True' }))
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))

    expect(screen.getByText('Prediction correct')).toBeVisible()
    expect(screen.getByRole('dialog', { name: 'Mission complete' })).toBeVisible()
  })

  it('finishes a guided sequence and returns to its overview', async () => {
    localStorage.setItem('logic-game:campaign-progress:v1', JSON.stringify([
      'tutorial-valuation', 'tutorial-evaluation', 'tutorial-add-world', 'tutorial-accessibility',
      'tutorial-add-relation', 'tutorial-remove-relation', 'tutorial-nested-modalities', 'tutorial-local-countermodel',
      'tutorial-global-model', 'tutorial-frame-constraint', 'tutorial-relational-property', 'tutorial-correspondence',
    ]))
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Tutorial' }))
    await user.click(screen.getByRole('button', { name: 'Continue tutorial' }))
    await user.click(screen.getByRole('button', { name: '+ Add world' }))
    await user.type(screen.getAllByLabelText('True atoms')[1], 'p')
    await user.type(screen.getAllByLabelText('True atoms')[2], 'q')
    await user.click(screen.getByRole('button', { name: '+ Add edge' }))
    await user.selectOptions(screen.getAllByLabelText('Edge target world')[0], 'w1')
    await user.click(screen.getByRole('button', { name: '+ Add edge' }))
    await user.selectOptions(screen.getAllByLabelText('Edge target world')[1], 'w2')
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))

    expect(screen.getByRole('dialog', { name: 'Sequence complete' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Back to tutorial' }))
    expect(screen.getByRole('heading', { name: 'Game Tutorial' })).toBeVisible()
    expect(screen.getByLabelText('13 of 13 tutorial steps complete')).toBeVisible()
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

  it('preserves the active campaign while browsing another track and the guide', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Campaigns' }))
    await user.click(screen.getByRole('button', { name: 'Start campaign' }))
    await user.click(screen.getByRole('button', { name: 'Campaigns' }))
    await user.click(screen.getByRole('button', { name: /Global Model Building/ }))
    await user.click(screen.getByRole('button', { name: 'Guide' }))
    await user.click(screen.getByRole('button', { name: 'Return to current mission' }))

    expect(screen.getByText('Necessary, not actual')).toBeVisible()
    expect(screen.getByLabelText('Campaign track')).toHaveValue('0')
    expect(screen.getByLabelText('Modal formula')).toHaveValue('□p ∧ ¬p')
  })

  it('falls back to a safe initial model when persisted data is malformed', () => {
    localStorage.setItem('logic-game:sandbox:v1', JSON.stringify({
      formulaSource: 'p', worlds: [{ id: 42 }], edges: [], evaluationWorld: 'w0', targetTruth: true,
    }))
    render(<App />)

    expect(screen.getAllByLabelText('World')).toHaveLength(2)
    expect(screen.getByLabelText('Modal formula')).toHaveValue('◇p')
  })

  it('exports and imports a validated model as JSON', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Data' }))
    const editor = screen.getByLabelText('Model JSON') as HTMLTextAreaElement
    const exported = JSON.parse(editor.value)
    expect(exported).toMatchObject({ format: 'logic-model-builder', version: 1, formula: '◇p' })
    exported.formula = 'box q'
    exported.worlds = [{ id: 'root', atoms: 'q', position: { x: 12, y: 34 } }]
    exported.edges = [{ from: 'root', to: 'root' }]
    exported.evaluationWorld = 'root'
    fireEvent.change(editor, { target: { value: JSON.stringify(exported) } })
    await user.click(screen.getByRole('button', { name: 'Import JSON' }))

    expect(screen.getByLabelText('Modal formula')).toHaveValue('box q')
    expect(screen.getByLabelText('World')).toHaveValue('root')
    expect(screen.getByLabelText('Evaluation world')).toHaveValue('root')
  })

  it('resets learning progress independently of the sandbox', async () => {
    localStorage.setItem('logic-game:campaign-progress:v1', JSON.stringify(['tutorial-evaluation']))
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Data' }))
    await user.click(screen.getByRole('button', { name: 'Reset learning progress' }))
    expect(screen.getByRole('status')).toHaveTextContent('progress was reset')
    await user.click(screen.getByRole('button', { name: 'Close data manager' }))
    await user.click(screen.getByRole('button', { name: 'Tutorial' }))
    expect(screen.getByLabelText('0 of 13 tutorial steps complete')).toBeVisible()
  })

  it('shows truth by world and a structured countervaluation', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText('Semantic target'), 'frame')
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    expect(screen.getByText('Countervaluation')).toBeVisible()
    expect(screen.getByText('Truth under countervaluation')).toBeVisible()
    expect(screen.getAllByText(/w0:/).length).toBeGreaterThan(0)
  })

  it('records verification history in the local guest profile across reloads', async () => {
    const user = userEvent.setup()
    const view = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    await user.click(screen.getByRole('button', { name: 'Profile' }))
    expect(screen.getByText('Sandbox verification')).toBeVisible()
    expect(screen.getByText('1 successful verifications')).toBeVisible()
    view.unmount()

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Profile' }))
    expect(screen.getByText('Sandbox verification')).toBeVisible()
    expect(screen.getByText('1 successful verifications')).toBeVisible()
  })

  it('clears guest history without deleting learning progress', async () => {
    localStorage.setItem('logic-game:campaign-progress:v1', JSON.stringify(['tutorial-evaluation']))
    localStorage.setItem('logic-game:guest-profile:v1', JSON.stringify({
      id: 'guest-test', createdAt: '2026-01-01T00:00:00.000Z', history: [{
        id: 'attempt-1', timestamp: '2026-01-02T00:00:00.000Z', mode: 'tutorial',
        levelId: 'tutorial-evaluation', title: 'Evaluation world', scope: 'pointed',
        success: true, worldCount: 2, edgeCount: 0,
      }],
    }))
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Profile' }))
    await user.click(screen.getByRole('button', { name: 'Clear history' }))
    expect(screen.getByText('No attempts recorded yet')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Tutorial' }))
    expect(screen.getByLabelText('1 of 13 tutorial steps complete')).toBeVisible()
  })

  it('imports a guest profile backup with history and progress', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Data' }))
    const backup = {
      format: 'logic-model-builder-profile', version: 1,
      guest: { id: 'restored-guest', createdAt: '2026-01-01T00:00:00.000Z', history: [{
        id: 'restored-attempt', timestamp: '2026-01-02T00:00:00.000Z', mode: 'campaign',
        levelId: 'local-necessary-not-actual', title: 'Necessary, not actual', scope: 'pointed',
        success: true, worldCount: 2, edgeCount: 2,
      }] },
      completedLevelIds: ['local-necessary-not-actual'],
    }
    fireEvent.change(screen.getByLabelText('Model JSON'), { target: { value: JSON.stringify(backup) } })
    await user.click(screen.getByRole('button', { name: 'Import JSON' }))
    await user.click(screen.getByRole('button', { name: 'Profile' }))
    expect(screen.getByText('Necessary, not actual')).toBeVisible()
    expect(screen.getByText('1 levels in saved progress')).toBeVisible()
  })

  it('imports and starts a versioned custom mission', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Data' }))
    const customMission = {
      format: 'logic-model-builder-level', version: 1,
      level: {
        id: 'custom-test', chapter: 'Custom mission', title: 'Shared possibility', concept: 'Imported objective',
        instruction: 'Make ◇p true at w0.', formula: '◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 90, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
        edges: [], constraints: { requiredEdges: [{ from: 'w0', to: 'w1' }], forbiddenAtoms: { w0: ['p'] } }, editable: ['edges'],
      },
    }
    fireEvent.change(screen.getByLabelText('Model JSON'), { target: { value: JSON.stringify(customMission) } })
    await user.click(screen.getByRole('button', { name: 'Import JSON' }))

    expect(screen.getByText('Shared possibility')).toBeVisible()
    expect(screen.getByText('Make ◇p true at w0.')).toBeVisible()
    expect(screen.getByLabelText('Modal formula')).toBeDisabled()
    expect(screen.getByRole('button', { name: '+ Add edge' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '+ Add world' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    expect(screen.getByText(/Required edge w0Rw1 is missing/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: '+ Add edge' }))
    await user.selectOptions(screen.getByLabelText('Edge target world'), 'w1')
    await user.click(screen.getByRole('button', { name: 'Verify objective' }))
    expect(screen.getByRole('dialog', { name: 'Custom mission complete' })).toBeVisible()
  })

  it('exposes constraint, prediction, and bonus controls for custom mission authoring', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Data' }))

    expect(screen.getByLabelText('Min worlds')).toBeVisible()
    expect(screen.getByLabelText('Max edges')).toBeVisible()
    expect(screen.getByLabelText('Custom mission prediction')).toHaveValue('none')
    expect(screen.getByLabelText('Bonus maximum edges')).toBeVisible()
    expect(screen.getByLabelText('Required custom mission edges')).toBeVisible()
    expect(screen.getByLabelText('Forbidden custom mission atoms')).toBeVisible()
    expect(screen.getByRole('group', { name: 'Required frame properties' })).toBeVisible()
    expect(screen.getByRole('button', { name: '1. Capture mission start' })).toBeVisible()
    expect(screen.getByRole('button', { name: '2. Capture valid solution' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Download custom mission' })).toBeVisible()
  })

  it('captures and verifies separate custom-mission start and solution snapshots', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Data' }))
    await user.click(screen.getByRole('button', { name: '1. Capture mission start' }))
    expect(screen.getByText('Start captured')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '2. Capture valid solution' }))
    expect(screen.getByText('Solution verified')).toBeVisible()
    expect(screen.getByText(/Valid reference solution captured/)).toBeVisible()
  })

  it('requires the tutorial frame rule to be globally enforced', async () => {
    localStorage.setItem('logic-game:campaign-progress:v1', JSON.stringify([
      'tutorial-valuation', 'tutorial-evaluation', 'tutorial-add-world', 'tutorial-accessibility',
      'tutorial-add-relation', 'tutorial-remove-relation', 'tutorial-nested-modalities',
      'tutorial-local-countermodel', 'tutorial-global-model',
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
