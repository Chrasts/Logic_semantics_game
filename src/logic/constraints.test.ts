import { describe, expect, it } from 'vitest'
import { checkConstructionConstraints, describeConstructionConstraints } from './constraints'

const input = {
  worldIds: ['w0', 'w1'],
  explicitEdges: [{ from: 'w0', to: 'w1' }],
  effectiveEdges: [{ from: 'w0', to: 'w1' }],
  valuation: { w0: [], w1: ['p'] },
}

describe('construction constraints', () => {
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
})
