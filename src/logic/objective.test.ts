import { describe, expect, it } from 'vitest'
import { atom, box, implies } from './formula'
import { verifyObjective } from './objective'

const p = atom('p')

describe('game objectives', () => {
  it('distinguishes pointed truth from model-global truth', () => {
    const input = { worldIds: ['w0', 'w1'], edges: [], valuation: { w0: ['p'], w1: [] }, formula: p }
    expect(verifyObjective({ scope: 'pointed', targetTruth: true, evaluationWorld: 'w0' }, input).success).toBe(true)
    expect(verifyObjective({ scope: 'model', targetTruth: true }, input).success).toBe(false)
  })

  it('checks a formula under every valuation of a frame', () => {
    const input = { worldIds: ['w0'], edges: [{ from: 'w0', to: 'w0' }], valuation: { w0: [] }, formula: implies(box(p), p) }
    expect(verifyObjective({ scope: 'frame', targetTruth: true }, input).formula.holds).toBe(true)
  })

  it('compares frame validity with a relational property', () => {
    const input = { worldIds: ['w0'], edges: [], valuation: { w0: [] }, formula: implies(box(p), p) }
    const result = verifyObjective({ scope: 'correspondence', targetTruth: true, correspondenceProperty: 'reflexive' }, input)
    expect(result.success).toBe(true)
    expect(result.formula.holds).toBe(false)
    expect(result.relation?.holds).toBe(false)
    expect(result.correspondence?.holds).toBe(true)
  })
})
