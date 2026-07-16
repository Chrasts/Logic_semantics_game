export type WorldId = string

export interface KripkeWorld {
  readonly id: WorldId
  readonly valuation: ReadonlySet<string>
}

export interface AccessibilityEdge {
  readonly from: WorldId
  readonly to: WorldId
}

/** A finite Kripke model M = (W, R, V). */
export interface KripkeModel {
  readonly worlds: ReadonlyMap<WorldId, KripkeWorld>
  readonly edges: readonly AccessibilityEdge[]
}

export function createModel(
  valuations: Readonly<Record<WorldId, readonly string[]>>,
  edges: readonly AccessibilityEdge[] = [],
): KripkeModel {
  const worlds = new Map<WorldId, KripkeWorld>()

  for (const [id, atoms] of Object.entries(valuations)) {
    if (!id.trim()) throw new Error('World id must not be empty.')
    worlds.set(id, { id, valuation: new Set(atoms) })
  }

  for (const edge of edges) {
    if (!worlds.has(edge.from) || !worlds.has(edge.to)) {
      throw new Error(`Edge ${edge.from} → ${edge.to} references an unknown world.`)
    }
  }

  return { worlds, edges: [...edges] }
}

export function successors(model: KripkeModel, worldId: WorldId): readonly WorldId[] {
  if (!model.worlds.has(worldId)) throw new Error(`Unknown world: ${worldId}`)
  return model.edges.filter(({ from }) => from === worldId).map(({ to }) => to)
}

