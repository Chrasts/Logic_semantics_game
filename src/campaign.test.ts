import { describe, expect, it } from 'vitest'
import { checkConstructionConstraints, checkFrameProperty, parseFormula, verifyObjective, type AccessibilityEdge, type FramePropertyName } from './logic'
import { campaignTracks } from './campaign'

const level = (id: string) => campaignTracks.flatMap((track) => track.levels).find((item) => item.id === id)!
const correspondenceProperties: Record<string, FramePropertyName> = { t: 'reflexive', d: 'serial', b: 'symmetric', '4': 'transitive', '5': 'euclidean' }
const verify = (id: string, edges: readonly AccessibilityEdge[], valuation?: Record<string, string[]>) => {
  const item = level(id)
  const worldIds = item.worlds.map((world) => world.id)
  return verifyObjective({
    scope: item.scope,
    targetTruth: item.targetTruth,
    evaluationWorld: item.evaluationWorld,
    correspondenceProperty: item.correspondencePreset ? correspondenceProperties[item.correspondencePreset] : undefined,
  }, {
    worldIds,
    edges,
    valuation: valuation ?? Object.fromEntries(item.worlds.map((world) => [world.id, world.atoms ? world.atoms.split(' ') : []])),
    formula: parseFormula(item.formula),
  })
}

const expectSolved = (id: string, edges: readonly AccessibilityEdge[], valuation?: Record<string, string[]>) => {
  const item = level(id)
  const worldIds = item.worlds.map((world) => world.id)
  const actualValuation = valuation ?? Object.fromEntries(item.worlds.map((world) => [world.id, world.atoms ? world.atoms.split(' ') : []]))
  expect(checkConstructionConstraints({ worldIds, explicitEdges: edges, effectiveEdges: edges, valuation: actualValuation }, item.constraints ?? {})).toEqual([])
  for (const [property, mode] of Object.entries(item.frameRules ?? {})) if (mode !== 'off') expect(checkFrameProperty(worldIds, edges, property as FramePropertyName).holds).toBe(true)
  expect(verify(id, edges, actualValuation).success).toBe(true)
}

describe('campaign level solvability', () => {
  it('defines five tracks and unique level identifiers', () => {
    const ids = campaignTracks.flatMap((track) => track.levels.map((item) => item.id))
    expect(campaignTracks).toHaveLength(5)
    expect(ids).toHaveLength(17)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('solves the constrained local satisfiability level', () => {
    const edges = [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w1' }]
    expect(checkFrameProperty(['w0', 'w1'], edges, 'serial').holds).toBe(true)
    expectSolved('local-necessary-not-actual', edges)
  })

  it('constructs the distribution countermodel', () => {
    expectSolved('local-distribution-countermodel', [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }])
    expectSolved('local-contingent-possibility', [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }])
  })

  it('solves both global-model objectives', () => {
    expectSolved('global-persistence', [{ from: 'w1', to: 'w0' }])
    expectSolved('global-possibility', [
      { from: 'w0', to: 'w0' }, { from: 'w1', to: 'w0' }, { from: 'w2', to: 'w0' },
    ])
    expectSolved('global-no-dead-ends', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }])
  })

  it('builds a countervaluation for T', () => {
    expectSolved('witness-t', [], { w0: [] })
    expectSolved('witness-b', [{ from: 'w0', to: 'w1' }], { w0: ['p'], w1: [] })
    expectSolved('witness-four', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], { w0: [], w1: ['p'], w2: [] })
  })

  it('solves the frame-engineering levels', () => {
    expectSolved('frame-t', [{ from: 'w0', to: 'w0' }, { from: 'w1', to: 'w1' }])
    expectSolved('frame-d', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }])
    expectSolved('frame-s4', [
      { from: 'w0', to: 'w0' }, { from: 'w1', to: 'w1' }, { from: 'w2', to: 'w2' },
      { from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w0', to: 'w2' },
    ])
  })

  it('solves all five correspondence levels', () => {
    expectSolved('correspondence-t', [{ from: 'w0', to: 'w0' }, { from: 'w1', to: 'w1' }])
    expectSolved('correspondence-d', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }])
    expectSolved('correspondence-b', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }])
    expectSolved('correspondence-four', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w0', to: 'w2' }])
    expectSolved('correspondence-five', [
      { from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' },
      { from: 'w1', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w2', to: 'w1' }, { from: 'w2', to: 'w2' },
    ])
  })
})
