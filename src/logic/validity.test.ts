import { describe, expect, it } from 'vitest'
import { box, diamond, implies, atom } from './formula'
import { createModel } from './model'
import { checkFrameValidity, evaluateAtAllWorlds } from './validity'

const p = atom('p')

describe('model-wide truth', () => {
  it('finds a counterexample world under the current valuation', () => {
    const model = createModel({ w0: ['p'], w1: [] })
    expect(evaluateAtAllWorlds(model, p).counterexample?.worldId).toBe('w1')
  })
})

describe('finite frame validity', () => {
  it('validates axiom T on a reflexive frame', () => {
    const formula = implies(box(p), p)
    const result = checkFrameValidity(['w0'], [{ from: 'w0', to: 'w0' }], formula)
    expect(result).toEqual({ valid: true, checkedValuations: 2 })
  })

  it('returns a countervaluation for axiom T on a non-reflexive frame', () => {
    const result = checkFrameValidity(['w0'], [], implies(box(p), p))
    expect(result.valid).toBe(false)
    expect(result.counterexample).toMatchObject({ worldId: 'w0', valuation: { w0: [] } })
  })

  it('characterizes seriality with axiom D on small examples', () => {
    const axiomD = implies(box(p), diamond(p))
    expect(checkFrameValidity(['w0'], [{ from: 'w0', to: 'w0' }], axiomD).valid).toBe(true)
    expect(checkFrameValidity(['w0'], [], axiomD).valid).toBe(false)
  })

  it('validates axiom B on a symmetric frame and refutes it otherwise', () => {
    const axiomB = implies(p, box(diamond(p)))
    expect(checkFrameValidity(['a', 'b'], [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }], axiomB).valid).toBe(true)
    expect(checkFrameValidity(['a', 'b'], [{ from: 'a', to: 'b' }], axiomB).valid).toBe(false)
  })

  it('validates axiom 4 exactly when the sample frame is transitive', () => {
    const axiom4 = implies(box(p), box(box(p)))
    const path = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }]
    expect(checkFrameValidity(['a', 'b', 'c'], [...path, { from: 'a', to: 'c' }], axiom4).valid).toBe(true)
    expect(checkFrameValidity(['a', 'b', 'c'], path, axiom4).valid).toBe(false)
  })

  it('validates axiom 5 on a Euclidean frame and refutes it otherwise', () => {
    const axiom5 = implies(diamond(p), box(diamond(p)))
    const fork = [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }]
    const euclidean = [...fork, { from: 'b', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'b' }, { from: 'c', to: 'c' }]
    expect(checkFrameValidity(['a', 'b', 'c'], euclidean, axiom5).valid).toBe(true)
    expect(checkFrameValidity(['a', 'b', 'c'], fork, axiom5).valid).toBe(false)
  })

  it('honors the valuation safety limit', () => {
    expect(() => checkFrameValidity(['w0', 'w1'], [], implies(p, p), 2)).toThrow(/current limit/)
  })
})
