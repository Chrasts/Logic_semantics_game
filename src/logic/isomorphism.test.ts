import { describe, expect, it } from 'vitest'
import { areFiniteModelsIsomorphic, canonicalModelSignature } from './isomorphism'

describe('finite model isomorphism', () => {
  it('ignores world names while preserving relation and valuation', () => {
    const left = { worldIds: ['w0', 'w1'], edges: [{ from: 'w0', to: 'w1' }], valuation: { w0: [], w1: ['p'] }, evaluationWorld: 'w0' }
    const renamed = { worldIds: ['a', 'b'], edges: [{ from: 'a', to: 'b' }], valuation: { a: [], b: ['p'] }, evaluationWorld: 'a' }
    expect(areFiniteModelsIsomorphic(left, renamed)).toBe(true)
  })

  it('distinguishes a changed relation, valuation, or evaluation point', () => {
    const base = { worldIds: ['a', 'b'], edges: [{ from: 'a', to: 'b' }], valuation: { a: [], b: ['p'] }, evaluationWorld: 'a' }
    expect(areFiniteModelsIsomorphic(base, { ...base, edges: [{ from: 'b', to: 'a' }] })).toBe(false)
    expect(areFiniteModelsIsomorphic(base, { ...base, valuation: { a: ['p'], b: [] } })).toBe(false)
    expect(areFiniteModelsIsomorphic(base, { ...base, evaluationWorld: 'b' })).toBe(false)
  })

  it('can compare frames while ignoring valuations and points', () => {
    const left = { worldIds: ['a'], edges: [{ from: 'a', to: 'a' }], valuation: { a: ['p'] }, evaluationWorld: 'a' }
    const right = { worldIds: ['x'], edges: [{ from: 'x', to: 'x' }], valuation: { x: [] }, evaluationWorld: 'x' }
    expect(canonicalModelSignature(left, { includeValuation: false, preserveEvaluationWorld: false })).toBe(canonicalModelSignature(right, { includeValuation: false, preserveEvaluationWorld: false }))
  })
})
