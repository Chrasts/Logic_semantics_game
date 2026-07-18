import { describe, expect, it } from 'vitest'
import { assertCompatibleAuthoredConstraints, parseAuthoredAtoms, parseAuthoredEdges } from './author-constraints'

describe('custom mission constraint authoring', () => {
  it('parses edge and atom lists', () => {
    expect(parseAuthoredEdges('w0 -> w1, w1 → w2', ['w0', 'w1', 'w2'])).toEqual([{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }])
    expect(parseAuthoredAtoms('w0: p q; w1: r', ['w0', 'w1'])).toEqual({ w0: ['p', 'q'], w1: ['r'] })
  })

  it('rejects unknown worlds and malformed atoms', () => {
    expect(() => parseAuthoredEdges('w0 -> missing', ['w0'])).toThrow(/unknown world/i)
    expect(() => parseAuthoredAtoms('w0: not-an-atom', ['w0'])).toThrow(/invalid atom/i)
  })

  it('rejects contradictory authored constraints', () => {
    expect(() => assertCompatibleAuthoredConstraints({ requiredEdges: [{ from: 'w0', to: 'w1' }], forbiddenEdges: [{ from: 'w0', to: 'w1' }] })).toThrow(/both required and forbidden/i)
    expect(() => assertCompatibleAuthoredConstraints({ requiredAtoms: { w0: ['p'] }, forbiddenAtoms: { w0: ['p'] } })).toThrow(/both required and forbidden/i)
  })
})
