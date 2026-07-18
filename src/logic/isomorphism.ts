import type { AccessibilityEdge, WorldId } from './model'

export interface FiniteModelStructure {
  readonly worldIds: readonly WorldId[]
  readonly edges: readonly AccessibilityEdge[]
  readonly valuation: Readonly<Record<WorldId, readonly string[]>>
  readonly evaluationWorld?: WorldId
}

export interface CanonicalModelOptions {
  readonly includeValuation?: boolean
  readonly preserveEvaluationWorld?: boolean
  readonly maximumWorlds?: number
}

const permutations = <T,>(items: readonly T[]): T[][] => {
  if (items.length < 2) return [items.slice()]
  return items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((tail) => [item, ...tail]))
}

/** Canonicalizes a small finite Kripke structure up to renaming of worlds. */
export function canonicalModelSignature(structure: FiniteModelStructure, options: CanonicalModelOptions = {}): string {
  const maximumWorlds = options.maximumWorlds ?? 8
  const ids = [...structure.worldIds]
  if (ids.length === 0) throw new Error('Cannot canonicalize an empty Kripke structure.')
  if (new Set(ids).size !== ids.length) throw new Error('World identifiers must be unique before canonicalization.')
  if (ids.length > maximumWorlds) throw new Error(`Isomorphism comparison currently supports at most ${maximumWorlds} worlds.`)
  const known = new Set(ids)
  if (structure.edges.some(({ from, to }) => !known.has(from) || !known.has(to))) throw new Error('An edge references an unknown world.')
  const preservePoint = options.preserveEvaluationWorld ?? Boolean(structure.evaluationWorld)
  if (preservePoint && (!structure.evaluationWorld || !known.has(structure.evaluationWorld))) throw new Error('The preserved evaluation world must exist.')
  const fixed = preservePoint ? structure.evaluationWorld! : undefined
  const remaining = fixed ? ids.filter((id) => id !== fixed) : ids
  const orders = permutations(remaining).map((order) => fixed ? [fixed, ...order] : order)
  const relation = new Set(structure.edges.map(({ from, to }) => `${from}\u0000${to}`))
  const includeValuation = options.includeValuation ?? true
  const signatures = orders.map((order) => {
    const atoms = includeValuation
      ? order.map((world) => [...new Set(structure.valuation[world] ?? [])].sort().join(',')).join('|')
      : ''
    const matrix = order.flatMap((from) => order.map((to) => relation.has(`${from}\u0000${to}`) ? '1' : '0')).join('')
    return `${order.length};${atoms};${matrix}`
  })
  return signatures.sort()[0]
}

export function areFiniteModelsIsomorphic(left: FiniteModelStructure, right: FiniteModelStructure, options: CanonicalModelOptions = {}): boolean {
  return canonicalModelSignature(left, options) === canonicalModelSignature(right, options)
}
