import { describe, expect, it } from 'vitest'
import { parseCustomLevelFile, parseCustomLevelPackage, serializeCustomLevel, type ReferenceSolution } from './level-format'
import type { GameLevel } from './campaign'

const level: GameLevel = {
  id: 'custom-example', chapter: 'Custom', title: 'Example mission', concept: 'Pointed possibility',
  instruction: 'Make ◇p true at w0.', formula: '◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
  worlds: [{ id: 'w0', atoms: '', position: { x: 90, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
  edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, requiredProperties: ['serial'] },
  bonusConstraints: { maximumEdges: 1 }, prediction: { kind: 'truth', prompt: 'Will the formula be true?' }, editable: ['edges'],
}

const referenceSolution: ReferenceSolution = {
  worlds: level.worlds,
  edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w1' }],
  evaluationWorld: 'w0',
}

describe('custom mission format', () => {
  it('round-trips a versioned mission', () => {
    expect(parseCustomLevelFile(JSON.parse(serializeCustomLevel(level)))).toEqual(level)
  })

  it('stores a verified reference solution separately from the player start', () => {
    const parsed = parseCustomLevelPackage(JSON.parse(serializeCustomLevel(level, referenceSolution)))
    expect(parsed.level.edges).toEqual([])
    expect(parsed.referenceSolution).toEqual(referenceSolution)
  })

  it('rejects a reference solution that does not meet the objective', () => {
    const invalid: ReferenceSolution = {
      ...referenceSolution,
      edges: [{ from: 'w0', to: 'w0' }, { from: 'w1', to: 'w1' }],
    }
    expect(() => parseCustomLevelPackage(JSON.parse(serializeCustomLevel(level, invalid)))).toThrow(/does not meet the objective/i)
  })

  it('rejects a reference solution that violates construction constraints', () => {
    const invalid: ReferenceSolution = { ...referenceSolution, edges: [{ from: 'w0', to: 'w1' }] }
    expect(() => parseCustomLevelPackage(JSON.parse(serializeCustomLevel(level, invalid)))).toThrow(/must be serial/i)
  })

  it('rejects malformed formulas and unknown edge endpoints', () => {
    const file = JSON.parse(serializeCustomLevel(level))
    file.level.formula = '□('
    expect(() => parseCustomLevelFile(file)).toThrow()
    file.level.formula = 'p'
    file.level.edges = [{ from: 'w0', to: 'missing' }]
    expect(() => parseCustomLevelFile(file)).toThrow(/unknown world/i)
  })

  it('rejects unsupported versions', () => {
    const file = JSON.parse(serializeCustomLevel(level))
    file.version = 2
    expect(() => parseCustomLevelFile(file)).toThrow(/unsupported/i)
  })

  it('rejects inconsistent bounds and contradictory prediction scope', () => {
    const file = JSON.parse(serializeCustomLevel(level))
    file.level.constraints = { minimumWorlds: 3, maximumWorlds: 2 }
    expect(() => parseCustomLevelFile(file)).toThrow(/inconsistent/i)
    file.level.constraints = undefined
    file.level.prediction = { kind: 'counterexample-world', prompt: 'Where?' }
    expect(() => parseCustomLevelFile(file)).toThrow(/model-global/i)
  })

  it('round-trips a baseline-relative semantic change budget', () => {
    const budgeted = { ...level, constraints: { ...level.constraints, maximumChanges: 2 } }
    expect(parseCustomLevelFile(JSON.parse(serializeCustomLevel(budgeted))).constraints?.maximumChanges).toBe(2)
  })

  it('round-trips a comparison formula and rejects correspondence mixing', () => {
    const equivalence = { ...level, comparisonFormula: 'p', formula: 'box p' }
    expect(parseCustomLevelFile(JSON.parse(serializeCustomLevel(equivalence))).comparisonFormula).toBe('p')
    const invalid = { ...equivalence, scope: 'correspondence' as const, correspondencePreset: 't' as const }
    expect(() => parseCustomLevelFile(JSON.parse(serializeCustomLevel(invalid)))).toThrow(/cannot be combined/i)
  })

  it('validates a required frame-property interaction', () => {
    const diagnostic: GameLevel = {
      ...level,
      prediction: { kind: 'frame-property', prompt: 'Which property?', expectedProperty: 'symmetric', propertyChoices: ['symmetric', 'transitive'], mustBeCorrect: true },
    }
    expect(parseCustomLevelFile(JSON.parse(serializeCustomLevel(diagnostic))).prediction).toEqual(diagnostic.prediction)
    const invalid = JSON.parse(serializeCustomLevel(diagnostic))
    invalid.level.prediction.propertyChoices = ['transitive', 'serial']
    expect(() => parseCustomLevelFile(invalid)).toThrow(/answer choices/i)
  })

  it('validates explicit countervaluation choices', () => {
    const countervaluation: GameLevel = {
      ...level,
      prediction: { kind: 'countervaluation', prompt: 'Which valuation?', expectedChoice: 'A', mustBeCorrect: true, countervaluationChoices: [
        { id: 'A', valuation: { w0: [], w1: ['p'] } }, { id: 'B', valuation: { w0: ['p'], w1: [] } },
      ] },
    }
    expect(parseCustomLevelFile(JSON.parse(serializeCustomLevel(countervaluation))).prediction).toEqual(countervaluation.prediction)
    const invalid = JSON.parse(serializeCustomLevel(countervaluation))
    delete invalid.level.prediction.countervaluationChoices[0].valuation.w1
    expect(() => parseCustomLevelFile(invalid)).toThrow(/every mission world/i)
  })

  it('validates candidate models and their relations', () => {
    const comparison: GameLevel = {
      ...level,
      prediction: { kind: 'model-choice', prompt: 'Which model?', expectedChoice: 'A', mustBeCorrect: true, modelChoices: [
        { id: 'A', evaluationWorld: 'w0', worlds: [{ id: 'w0', atoms: '' }, { id: 'w1', atoms: 'p' }], edges: [{ from: 'w0', to: 'w1' }] },
        { id: 'B', evaluationWorld: 'w0', worlds: [{ id: 'w0', atoms: '' }], edges: [] },
      ] },
    }
    expect(parseCustomLevelFile(JSON.parse(serializeCustomLevel(comparison))).prediction).toEqual(comparison.prediction)
    const invalid = JSON.parse(serializeCustomLevel(comparison))
    invalid.level.prediction.modelChoices[0].edges[0].to = 'missing'
    expect(() => parseCustomLevelFile(invalid)).toThrow(/unknown world/i)
  })
})
