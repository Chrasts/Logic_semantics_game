import { describe, expect, it } from 'vitest'
import { atom, box, diamond, implies } from './formula'
import { verifyObjective } from './objective'

const p = atom('p')

describe('game objectives', () => {
  it('distinguishes pointed truth from model-global truth', () => {
    const input = { worldIds: ['w0', 'w1'], edges: [], valuation: { w0: ['p'], w1: [] }, formula: p }
    expect(verifyObjective({ scope: 'pointed', targetTruth: true, evaluationWorld: 'w0' }, input).success).toBe(true)
    expect(verifyObjective({ scope: 'model', targetTruth: true }, input).success).toBe(false)
  })

  it('diagnoses truth at the wrong world for a pointed objective', () => {
    const input = { worldIds: ['w0', 'w1'], edges: [], valuation: { w0: [], w1: ['p'] }, formula: p }
    const result = verifyObjective({ scope: 'pointed', targetTruth: true, evaluationWorld: 'w0' }, input)
    expect(result.success).toBe(false)
    expect(result.formula.detail).toMatch(/objective is pointed.*w1.*w0/i)
  })

  it('explains why a model-global counterexample needs a failing world', () => {
    const input = { worldIds: ['w0'], edges: [], valuation: { w0: ['p'] }, formula: p }
    const result = verifyObjective({ scope: 'model', targetTruth: false }, input)
    expect(result.formula.detail).toMatch(/requires the formula to fail at least at one world/i)
  })

  it('checks a formula under every valuation of a frame', () => {
    const input = { worldIds: ['w0'], edges: [{ from: 'w0', to: 'w0' }], valuation: { w0: [] }, formula: implies(box(p), p) }
    expect(verifyObjective({ scope: 'frame', targetTruth: true }, input).formula.holds).toBe(true)
  })

  it('returns structured truth diagnostics and countervaluations', () => {
    const input = { worldIds: ['w0'], edges: [], valuation: { w0: ['p'] }, formula: implies(box(p), p) }
    const result = verifyObjective({ scope: 'frame', targetTruth: false }, input)
    expect(result.formula.witnessValuation).toEqual({ w0: [] })
    expect(result.formula.truthByWorld).toEqual([{ worldId: 'w0', value: false }])
    expect(result.formula.evaluationTraces?.[0]).toMatchObject({ formula: '□p → p', worldId: 'w0', value: false })
  })

  it('compares frame validity with a relational property', () => {
    const input = { worldIds: ['w0'], edges: [], valuation: { w0: [] }, formula: implies(box(p), p) }
    const result = verifyObjective({ scope: 'correspondence', targetTruth: true, correspondenceProperty: 'reflexive' }, input)
    expect(result.success).toBe(true)
    expect(result.formula.holds).toBe(false)
    expect(result.relation?.holds).toBe(false)
    expect(result.correspondence?.holds).toBe(true)
  })

  it('compares formulas locally and throughout a displayed model', () => {
    const input = { worldIds: ['w0', 'w1'], edges: [], valuation: { w0: ['p'], w1: [] }, formula: p, comparisonFormula: box(p) }
    expect(verifyObjective({ scope: 'pointed', targetTruth: true, evaluationWorld: 'w0' }, input).success).toBe(true)
    const global = verifyObjective({ scope: 'model', targetTruth: true }, input)
    expect(global.success).toBe(false)
    expect(global.formula.detail).toMatch(/w1/i)
  })

  it('finds a countervaluation to frame equivalence', () => {
    const input = { worldIds: ['w0'], edges: [], valuation: { w0: [] }, formula: box(p), comparisonFormula: diamond(p) }
    const result = verifyObjective({ scope: 'frame', targetTruth: false }, input)
    expect(result.success).toBe(true)
    expect(result.formula.witnessValuation).toBeDefined()
    expect(result.formula.detail).toMatch(/while/i)
  })
})
