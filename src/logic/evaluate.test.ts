import { describe, expect, it } from 'vitest'
import { and, atom, box, diamond, implies, not, or } from './formula'
import { createModel } from './model'
import { evaluate } from './evaluate'

const p = atom('p')
const q = atom('q')

describe('propositional semantics', () => {
  const model = createModel({ w0: ['p'] })

  it('evaluates atoms and negation', () => {
    expect(evaluate(model, 'w0', p)).toBe(true)
    expect(evaluate(model, 'w0', q)).toBe(false)
    expect(evaluate(model, 'w0', not(q))).toBe(true)
  })

  it('evaluates conjunction, disjunction, and material implication', () => {
    expect(evaluate(model, 'w0', and(p, q))).toBe(false)
    expect(evaluate(model, 'w0', or(p, q))).toBe(true)
    expect(evaluate(model, 'w0', implies(p, q))).toBe(false)
    expect(evaluate(model, 'w0', implies(q, p))).toBe(true)
  })
})

describe('modal semantics', () => {
  it('uses vacuous truth for box and falsehood for diamond at a terminal world', () => {
    const model = createModel({ w0: [] })
    expect(evaluate(model, 'w0', box(p))).toBe(true)
    expect(evaluate(model, 'w0', diamond(p))).toBe(false)
  })

  it('evaluates box and diamond with one successor', () => {
    const model = createModel({ w0: [], w1: ['p'] }, [{ from: 'w0', to: 'w1' }])
    expect(evaluate(model, 'w0', box(p))).toBe(true)
    expect(evaluate(model, 'w0', diamond(p))).toBe(true)
  })

  it('requires all successors for box on a branching frame', () => {
    const model = createModel(
      { w0: [], w1: ['p'], w2: [] },
      [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }],
    )
    expect(evaluate(model, 'w0', box(p))).toBe(false)
    expect(evaluate(model, 'w0', diamond(p))).toBe(true)
  })

  it('evaluates nested modalities', () => {
    const model = createModel(
      { w0: [], w1: [], w2: ['p'] },
      [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }],
    )
    expect(evaluate(model, 'w0', diamond(diamond(p)))).toBe(true)
    expect(evaluate(model, 'w0', diamond(p))).toBe(false)
  })

  it('handles cycles because modal depth is finite', () => {
    const model = createModel(
      { w0: ['p'], w1: ['p'] },
      [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }],
    )
    expect(evaluate(model, 'w0', box(box(p)))).toBe(true)
  })

  it('evaluates reflexive edges', () => {
    const model = createModel({ w0: ['p'] }, [{ from: 'w0', to: 'w0' }])
    expect(evaluate(model, 'w0', box(p))).toBe(true)
    expect(evaluate(model, 'w0', diamond(not(p)))).toBe(false)
  })
})

describe('model integrity', () => {
  it('rejects edges that reference unknown worlds', () => {
    expect(() => createModel({ w0: [] }, [{ from: 'w0', to: 'missing' }])).toThrow(/unknown world/i)
  })

  it('rejects evaluation in an unknown world', () => {
    expect(() => evaluate(createModel({ w0: [] }), 'missing', p)).toThrow(/unknown world/i)
  })
})

