import type { AccessibilityEdge, WorldId } from './model'

export interface FrameProperties {
  readonly reflexive: boolean
  readonly symmetric: boolean
  readonly transitive: boolean
  readonly euclidean?: boolean
}

export type FramePropertyName = 'reflexive' | 'symmetric' | 'transitive' | 'euclidean' | 'serial' | 'irreflexive' | 'acyclic'

export interface FramePropertyResult {
  readonly property: FramePropertyName
  readonly holds: boolean
  readonly violations: readonly string[]
}

const edgeKey = (from: WorldId, to: WorldId) => `${from}\u0000${to}`

/** Returns the least relation containing the given edges with the selected frame properties. */
export function applyFrameProperties(
  worldIds: readonly WorldId[],
  edges: readonly AccessibilityEdge[],
  properties: FrameProperties,
): readonly AccessibilityEdge[] {
  const relation = new Map<string, AccessibilityEdge>()
  const add = (from: WorldId, to: WorldId) => relation.set(edgeKey(from, to), { from, to })

  edges.forEach(({ from, to }) => add(from, to))
  if (properties.reflexive) worldIds.forEach((world) => add(world, world))

  let changed = true
  while (changed) {
    changed = false
    const snapshot = [...relation.values()]

    if (properties.symmetric) {
      for (const { from, to } of snapshot) {
        const key = edgeKey(to, from)
        if (!relation.has(key)) {
          add(to, from)
          changed = true
        }
      }
    }

    if (properties.transitive) {
      const current = [...relation.values()]
      for (const first of current) {
        for (const second of current) {
          if (first.to !== second.from) continue
          const key = edgeKey(first.from, second.to)
          if (!relation.has(key)) {
            add(first.from, second.to)
            changed = true
          }
        }
      }
    }

    if (properties.euclidean) {
      const current = [...relation.values()]
      for (const first of current) {
        for (const second of current) {
          if (first.from !== second.from) continue
          const key = edgeKey(first.to, second.to)
          if (!relation.has(key)) {
            add(first.to, second.to)
            changed = true
          }
        }
      }
    }
  }

  return [...relation.values()]
}

export function checkFrameProperty(
  worldIds: readonly WorldId[],
  edges: readonly AccessibilityEdge[],
  property: FramePropertyName,
): FramePropertyResult {
  const relation = new Set(edges.map(({ from, to }) => edgeKey(from, to)))
  const has = (from: WorldId, to: WorldId) => relation.has(edgeKey(from, to))
  const violations: string[] = []

  if (property === 'reflexive') {
    for (const world of worldIds) if (!has(world, world)) violations.push(`${world} R ${world} is missing.`)
  } else if (property === 'irreflexive') {
    for (const world of worldIds) if (has(world, world)) violations.push(`${world} R ${world} violates irreflexivity.`)
  } else if (property === 'serial') {
    for (const world of worldIds) if (!worldIds.some((target) => has(world, target))) violations.push(`${world} has no successor.`)
  } else if (property === 'symmetric') {
    for (const { from, to } of edges) if (!has(to, from)) violations.push(`${from} R ${to}, but ${to} R ${from} is missing.`)
  } else if (property === 'transitive') {
    for (const first of edges) for (const second of edges) {
      if (first.to === second.from && !has(first.from, second.to)) violations.push(`${first.from} R ${first.to} and ${second.from} R ${second.to}, but ${first.from} R ${second.to} is missing.`)
    }
  } else if (property === 'euclidean') {
    for (const first of edges) for (const second of edges) {
      if (first.from === second.from && !has(first.to, second.to)) violations.push(`${first.from} R ${first.to} and ${first.from} R ${second.to}, but ${first.to} R ${second.to} is missing.`)
    }
  } else if (property === 'acyclic') {
    const visiting = new Set<WorldId>()
    const visited = new Set<WorldId>()
    const visit = (world: WorldId): boolean => {
      if (visiting.has(world)) return true
      if (visited.has(world)) return false
      visiting.add(world)
      for (const target of worldIds) if (has(world, target) && visit(target)) return true
      visiting.delete(world)
      visited.add(world)
      return false
    }
    if (worldIds.some(visit)) violations.push('The accessibility relation contains a directed cycle.')
  }

  return { property, holds: violations.length === 0, violations: [...new Set(violations)] }
}
