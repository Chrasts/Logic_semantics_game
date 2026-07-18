import { describe, expect, it } from 'vitest'
import { checkConstructionConstraints, checkFrameProperty, parseFormula, verifyObjective, type AccessibilityEdge, type FramePropertyName } from './logic'
import { campaignTracks, tutorialLevels } from './campaign'

const level = (id: string) => [...tutorialLevels, ...campaignTracks.flatMap((track) => track.levels)].find((item) => item.id === id)!
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
    comparisonFormula: item.comparisonFormula ? parseFormula(item.comparisonFormula) : undefined,
  })
}

const expectSolved = (id: string, edges: readonly AccessibilityEdge[], valuation?: Record<string, string[]>) => {
  const item = level(id)
  const worldIds = item.worlds.map((world) => world.id)
  const actualValuation = valuation ?? Object.fromEntries(item.worlds.map((world) => [world.id, world.atoms ? world.atoms.split(' ') : []]))
  const baseline = {
    worldIds, explicitEdges: item.edges,
    valuation: Object.fromEntries(item.worlds.map((world) => [world.id, world.atoms ? world.atoms.split(' ') : []])),
  }
  expect(checkConstructionConstraints({ worldIds, explicitEdges: edges, effectiveEdges: edges, valuation: actualValuation, baseline }, item.constraints ?? {})).toEqual([])
  for (const [property, mode] of Object.entries(item.frameRules ?? {})) if (mode !== 'off') expect(checkFrameProperty(worldIds, edges, property as FramePropertyName).holds).toBe(true)
  expect(verify(id, edges, actualValuation).success).toBe(true)
}

describe('campaign level solvability', () => {
  it('defines mathematically well-formed level data', () => {
    expect(tutorialLevels.every((item) => Boolean(item.learningObjective?.trim()))).toBe(true)
    for (const item of [...tutorialLevels, ...campaignTracks.flatMap((track) => track.levels)]) {
      const worldIds = item.worlds.map((world) => world.id)
      expect(worldIds.length, `${item.id}: non-empty W`).toBeGreaterThan(0)
      expect(new Set(worldIds).size, `${item.id}: unique worlds`).toBe(worldIds.length)
      expect(worldIds, `${item.id}: evaluation world`).toContain(item.evaluationWorld)
      expect(() => parseFormula(item.formula), `${item.id}: formula syntax`).not.toThrow()
      const comparisonFormula = item.comparisonFormula
      if (comparisonFormula) expect(() => parseFormula(comparisonFormula), `${item.id}: comparison formula syntax`).not.toThrow()
      for (const edge of item.edges) {
        expect(worldIds, `${item.id}: edge source`).toContain(edge.from)
        expect(worldIds, `${item.id}: edge target`).toContain(edge.to)
      }
      expect(item.scope === 'correspondence', `${item.id}: correspondence preset`).toBe(Boolean(item.correspondencePreset))
      if (item.prediction) {
        expect(item.prediction.prompt.trim(), `${item.id}: prediction prompt`).not.toBe('')
        if (item.prediction.kind === 'counterexample-world') expect(item.scope, `${item.id}: world prediction scope`).toBe('model')
        if (item.prediction.kind === 'frame-property') {
          expect(item.prediction.expectedProperty, `${item.id}: expected property`).toBeDefined()
          expect(item.prediction.propertyChoices, `${item.id}: property choices`).toContain(item.prediction.expectedProperty)
        }
        if (item.prediction.kind === 'model-choice') {
          expect(item.prediction.modelChoices?.length, `${item.id}: candidate models`).toBeGreaterThanOrEqual(2)
          expect(item.prediction.modelChoices?.map(({ id }) => id), `${item.id}: expected model`).toContain(item.prediction.expectedChoice)
        }
      }
      if (item.constraints?.minimumWorlds !== undefined && item.constraints.maximumWorlds !== undefined) {
        expect(item.constraints.minimumWorlds, `${item.id}: consistent world bounds`).toBeLessThanOrEqual(item.constraints.maximumWorlds)
      }
    }
  })

  it('defines six tracks and unique level identifiers', () => {
    const ids = campaignTracks.flatMap((track) => track.levels.map((item) => item.id))
    expect(campaignTracks).toHaveLength(6)
    expect(ids).toHaveLength(33)
    expect(new Set(ids).size).toBe(ids.length)
    expect(campaignTracks.flatMap((track) => track.levels).filter((item) => item.bonusConstraints).length).toBeGreaterThanOrEqual(3)
  })

  it('solves the constrained local satisfiability level', () => {
    const edges = [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w1' }]
    expect(checkFrameProperty(['w0', 'w1'], edges, 'serial').holds).toBe(true)
    expectSolved('local-necessary-not-actual', edges)
  })

  it('constructs the distribution countermodel', () => {
    expectSolved('local-distribution-countermodel', [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }])
    expectSolved('local-contingent-possibility', [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }])
    expectSolved('local-uniform-branching', [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }])
  })

  it('repairs a model within one semantic change', () => {
    expectSolved('local-one-change-repair', [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], { w0: [], w1: ['p'], w2: ['p'] })
    expectSolved('local-one-change-repair', [{ from: 'w0', to: 'w1' }])
  })

  it('defines a solvable candidate-model comparison mission', () => {
    expectSolved('local-compare-candidates', [])
  })

  it('solves the added tutorial constructions', () => {
    expectSolved('tutorial-accessibility', [{ from: 'w0', to: 'w1' }])
    expectSolved('tutorial-nested-modalities', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }])
    expectSolved('tutorial-local-countermodel', [{ from: 'w0', to: 'w1' }])
    expectSolved('tutorial-relational-property', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }])
  })

  it('solves both global-model objectives', () => {
    expectSolved('global-persistence', [{ from: 'w1', to: 'w0' }])
    expectSolved('global-possibility', [
      { from: 'w0', to: 'w0' }, { from: 'w1', to: 'w0' }, { from: 'w2', to: 'w0' },
    ])
    expectSolved('global-no-dead-ends', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }])
    expectSolved('global-return-to-truth', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }, { from: 'w2', to: 'w0' }])
  })

  it('builds a countervaluation for T', () => {
    expectSolved('witness-t', [], { w0: [] })
    expectSolved('witness-b', [{ from: 'w0', to: 'w1' }], { w0: ['p'], w1: [] })
    expectSolved('witness-four', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], { w0: [], w1: ['p'], w2: [] })
    expectSolved('witness-five', [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], { w0: [], w1: ['p'], w2: [] })
    expectSolved('choose-countervaluation-t', [], { w0: [] })
  })

  it('solves the frame-engineering levels', () => {
    expectSolved('frame-t', [{ from: 'w0', to: 'w0' }, { from: 'w1', to: 'w1' }])
    expectSolved('frame-d', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }])
    expectSolved('frame-s4', [
      { from: 'w0', to: 'w0' }, { from: 'w1', to: 'w1' }, { from: 'w2', to: 'w2' },
      { from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w0', to: 'w2' },
    ])
    expectSolved('frame-s5', [
      { from: 'w0', to: 'w0' }, { from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' },
      { from: 'w1', to: 'w0' }, { from: 'w1', to: 'w1' }, { from: 'w1', to: 'w2' },
      { from: 'w2', to: 'w0' }, { from: 'w2', to: 'w1' }, { from: 'w2', to: 'w2' },
    ])
    expectSolved('frame-identify-symmetry', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w1' }])
  })

  it('solves the positive correspondence levels', () => {
    expectSolved('correspondence-t', [{ from: 'w0', to: 'w0' }, { from: 'w1', to: 'w1' }])
    expectSolved('correspondence-d', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }])
    expectSolved('correspondence-b', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }])
    expectSolved('correspondence-four', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w0', to: 'w2' }])
    expectSolved('correspondence-five', [
      { from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' },
      { from: 'w1', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w2', to: 'w1' }, { from: 'w2', to: 'w2' },
    ])
    expectSolved('correspondence-five-cluster', [
      { from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }, { from: 'w0', to: 'w3' },
      { from: 'w1', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w1', to: 'w3' },
      { from: 'w2', to: 'w1' }, { from: 'w2', to: 'w2' }, { from: 'w2', to: 'w3' },
      { from: 'w3', to: 'w1' }, { from: 'w3', to: 'w2' }, { from: 'w3', to: 'w3' },
    ])
  })

  it('solves the negative correspondence instances', () => {
    expectSolved('correspondence-break-t', [{ from: 'w0', to: 'w0' }])
    expectSolved('correspondence-break-b', [{ from: 'w0', to: 'w1' }])
    expectSolved('correspondence-break-four', [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }])
    expectSolved('correspondence-break-five', [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }])
  })

  it('solves pointed, model-global, and frame equivalence missions', () => {
    expectSolved('equivalence-pointed-repair', [], { w0: ['p'], w1: [] })
    expectSolved('equivalence-model-diamond', [{ from: 'w0', to: 'w0' }])
    expectSolved('equivalence-frame-identity', [{ from: 'w0', to: 'w0' }, { from: 'w1', to: 'w1' }])
  })
})
