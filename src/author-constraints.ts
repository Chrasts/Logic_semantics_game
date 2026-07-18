import type { AccessibilityEdge, ConstructionConstraints, FramePropertyName } from './logic'

const edgeKey = ({ from, to }: AccessibilityEdge) => `${from}\u0000${to}`

export function parseAuthoredEdges(source: string, worldIds: readonly string[]): readonly AccessibilityEdge[] {
  if (!source.trim()) return []
  const edges = source.split(/[,;\n]+/u).map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const match = entry.match(/^(.+?)\s*(?:->|→)\s*(.+?)$/u)
    if (!match) throw new Error(`Invalid edge “${entry}”. Use source -> target.`)
    const edge = { from: match[1].trim(), to: match[2].trim() }
    if (!worldIds.includes(edge.from) || !worldIds.includes(edge.to)) throw new Error(`Edge “${entry}” references an unknown world.`)
    return edge
  })
  return [...new Map(edges.map((edge) => [edgeKey(edge), edge])).values()]
}

export function parseAuthoredAtoms(source: string, worldIds: readonly string[]): Readonly<Record<string, readonly string[]>> {
  if (!source.trim()) return {}
  const result: Record<string, string[]> = {}
  for (const entry of source.split(/[;\n]+/u).map((item) => item.trim()).filter(Boolean)) {
    const separator = entry.indexOf(':')
    if (separator < 1) throw new Error(`Invalid atom constraint “${entry}”. Use world: p q.`)
    const world = entry.slice(0, separator).trim()
    if (!worldIds.includes(world)) throw new Error(`Atom constraint “${entry}” references an unknown world.`)
    const atoms = entry.slice(separator + 1).split(/[\s,]+/u).filter(Boolean)
    if (atoms.length === 0 || atoms.some((atom) => !/^[A-Za-z][A-Za-z0-9_]*$/u.test(atom))) throw new Error(`Invalid atom list in “${entry}”.`)
    result[world] = [...new Set([...(result[world] ?? []), ...atoms])]
  }
  return result
}

export function assertCompatibleAuthoredConstraints(constraints: ConstructionConstraints): void {
  const requiredEdges = new Set((constraints.requiredEdges ?? []).map(edgeKey))
  const conflictingEdge = (constraints.forbiddenEdges ?? []).find((edge) => requiredEdges.has(edgeKey(edge)))
  if (conflictingEdge) throw new Error(`${conflictingEdge.from} -> ${conflictingEdge.to} cannot be both required and forbidden.`)

  for (const [world, atoms] of Object.entries(constraints.requiredAtoms ?? {})) {
    const forbidden = new Set(constraints.forbiddenAtoms?.[world] ?? [])
    const conflict = atoms.find((atom) => forbidden.has(atom))
    if (conflict) throw new Error(`${conflict} at ${world} cannot be both required and forbidden.`)
  }

  const requiredProperties = new Set<FramePropertyName>(constraints.requiredProperties ?? [])
  const conflictingProperty = (constraints.forbiddenProperties ?? []).find((property) => requiredProperties.has(property))
  if (conflictingProperty) throw new Error(`${conflictingProperty} cannot be both required and forbidden.`)
}
