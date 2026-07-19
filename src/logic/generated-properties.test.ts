import { describe, expect, it } from 'vitest'
import { applyFrameProperties, checkFrameProperty, type FramePropertyName } from './frame'
import { parseFormula } from './parser'
import { checkFrameValidity } from './validity'
import type { AccessibilityEdge } from './model'

const allRelations = (worldIds: readonly string[]): AccessibilityEdge[][] => {
  const pairs = worldIds.flatMap((from) => worldIds.map((to) => ({ from, to })))
  return Array.from({ length: 2 ** pairs.length }, (_, mask) => pairs.filter((_, index) => (mask & (2 ** index)) !== 0))
}

describe('generated finite-frame properties', () => {
  it('makes every individually enforced closure property hold on all frames up to three worlds', () => {
    const enforceable: readonly FramePropertyName[] = ['reflexive', 'symmetric', 'transitive', 'euclidean']
    const failures: string[] = []
    for (let size = 1; size <= 3; size += 1) {
      const worlds = Array.from({ length: size }, (_, index) => `w${index}`)
      for (const edges of allRelations(worlds)) {
        for (const property of enforceable) {
          const closure = applyFrameProperties(worlds, edges, {
            reflexive: property === 'reflexive', symmetric: property === 'symmetric',
            transitive: property === 'transitive', euclidean: property === 'euclidean',
          })
          if (!checkFrameProperty(worlds, closure, property).holds) failures.push(`${property} closure failed on ${size} worlds: ${JSON.stringify(edges)}`)
          const closurePairs = new Set(closure.map(({ from, to }) => `${from}\u0000${to}`))
          if (edges.some(({ from, to }) => !closurePairs.has(`${from}\u0000${to}`))) failures.push(`${property} closure removed an edge on ${size} worlds`)
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('matches standard axiom validity with its frame property on every frame up to three worlds', () => {
    const correspondences = ([
      ['box p -> p', 'reflexive'],
      ['box p -> diamond p', 'serial'],
      ['p -> box diamond p', 'symmetric'],
      ['box p -> box box p', 'transitive'],
      ['diamond p -> box diamond p', 'euclidean'],
    ] as const).map(([source, property]) => ({ source, property, formula: parseFormula(source) }))
    const failures: string[] = []
    for (let size = 1; size <= 3; size += 1) {
      const worlds = Array.from({ length: size }, (_, index) => `w${index}`)
      for (const edges of allRelations(worlds)) {
        for (const { source, property, formula } of correspondences) {
          const validity = checkFrameValidity(worlds, edges, formula).valid
          const propertyHolds = checkFrameProperty(worlds, edges, property).holds
          if (validity !== propertyHolds) failures.push(`${source}/${property} disagreed on ${JSON.stringify(edges)}`)
        }
      }
    }
    expect(failures).toEqual([])
  })
})
