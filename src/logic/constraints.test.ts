import { describe, expect, it } from 'vitest'
import { checkConstructionConstraints, countConstructionChanges, describeConstructionConstraints } from './constraints'

const input = {
  worldIds: ['w0', 'w1'],
  explicitEdges: [{ from: 'w0', to: 'w1' }],
  effectiveEdges: [{ from: 'w0', to: 'w1' }],
  valuation: { w0: [], w1: ['p'] },
}

describe('construction constraints', () => {
  it('counts world, explicit-edge, and atom-membership edits against a baseline', () => {
    const baseline = { worldIds: ['w0', 'w1'], explicitEdges: [{ from: 'w0', to: 'w1' }], valuation: { w0: ['p'], w1: [] } }
    const changed = { worldIds: ['w0', 'w1'], explicitEdges: [{ from: 'w1', to: 'w0' }], effectiveEdges: [{ from: 'w1', to: 'w0' }], valuation: { w0: [], w1: ['q'] }, baseline }
    expect(countConstructionChanges(changed)).toBe(4)
    expect(checkConstructionConstraints(changed, { maximumChanges: 3 })).toEqual([
      'Use at most 3 semantic changes from the initial model; the current construction uses 4.',
    ])
  })
  it('checks structural and valuation restrictions together', () => {
    expect(checkConstructionConstraints(input, {
      minimumWorlds: 2,
      maximumEdges: 1,
      requiredEdges: [{ from: 'w0', to: 'w1' }],
      forbiddenEdges: [{ from: 'w1', to: 'w0' }],
      requiredAtoms: { w1: ['p'] },
      forbiddenAtoms: { w0: ['p'] },
      forbiddenProperties: ['reflexive'],
    })).toEqual([])
  })

  it('reports every violated constraint', () => {
    const violations = checkConstructionConstraints(input, {
      minimumWorlds: 3,
      requiredEdges: [{ from: 'w1', to: 'w0' }],
      requiredAtoms: { w0: ['p'] },
      requiredProperties: ['symmetric'],
    })
    expect(violations).toHaveLength(4)
  })

  it('creates compact labels for the mission HUD', () => {
    expect(describeConstructionConstraints({
      minimumWorlds: 2,
      maximumWorlds: 2,
      forbiddenEdges: [{ from: 'w0', to: 'w0' }],
      requiredProperties: ['serial'],
    })).toEqual(['2 worlds', 'forbid w0Rw0', 'serial'])
  })

  it('counts a repeated relation only once', () => {
    const repeated = {
      ...input,
      explicitEdges: [input.explicitEdges[0], input.explicitEdges[0]],
    }
    expect(checkConstructionConstraints(repeated, { minimumEdges: 2 })).toEqual([
      'Use at least 2 distinct explicit edges.',
    ])
    expect(checkConstructionConstraints(repeated, { maximumEdges: 1 })).toEqual([])
  })
})
