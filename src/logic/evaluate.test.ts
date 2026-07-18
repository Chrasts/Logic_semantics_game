import { describe, expect, it } from 'vitest'
import { and, atom, box, diamond, implies, not, or } from './formula'
import { createModel } from './model'
import { evaluate, evaluateWithExplanation } from './evaluate'

const p = atom('p')
const q = atom('q')

it('rejects an empty set of worlds', () => {
  expect(() => createModel({})).toThrow(/at least one world/i)
})

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

  it('rejects invalid atom names', () => {
    expect(() => createModel({ w0: ['not-an-atom'] })).toThrow(/invalid atom/i)
  })

  it('treats duplicate edges as one relation pair', () => {
    const model = createModel(
      { w0: [], w1: ['p'] },
      [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w1' }],
    )
    expect(model.edges).toHaveLength(1)
  })
})

describe('deterministic explanations', () => {
  it('identifies a witness for diamond', () => {
    const model = createModel({ w0: [], w1: ['p'] }, [{ from: 'w0', to: 'w1' }])
    expect(evaluateWithExplanation(model, 'w0', diamond(p))).toMatchObject({
      value: true,
      explanation: '◇p is true: w0 R w1, and the formula is true at w1.',
      trace: { rule: 'possibility', worldId: 'w0', value: true, children: [{ formula: 'p', worldId: 'w1', value: true }] },
    })
  })

  it('identifies a counterexample for box', () => {
    const model = createModel({ w0: [], w1: [] }, [{ from: 'w0', to: 'w1' }])
    expect(evaluateWithExplanation(model, 'w0', box(p)).explanation).toContain('w0 R w1')
  })

  it('explains vacuous truth at a terminal world', () => {
    const evaluation = evaluateWithExplanation(createModel({ w0: [] }), 'w0', box(p))
    expect(evaluation.explanation).toMatch(/vacuously/)
    expect(evaluation.trace).toMatchObject({ rule: 'necessity', value: true, children: [], diagnostic: expect.stringMatching(/No successor/) })
  })

  it('retains every relevant branch in a nested evaluation tree', () => {
    const model = createModel(
      { w0: [], w1: ['p'], w2: [] },
      [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }],
    )
    const trace = evaluateWithExplanation(model, 'w0', box(implies(p, q))).trace
    expect(trace.rule).toBe('necessity')
    expect(trace.children).toHaveLength(2)
    expect(trace.children.map(({ worldId }) => worldId)).toEqual(['w1', 'w2'])
    expect(trace.children[0].children).toHaveLength(2)
  })
})
