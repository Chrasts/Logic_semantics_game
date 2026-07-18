import { checkFrameProperty, type FramePropertyName } from './frame'
import type { AccessibilityEdge, WorldId } from './model'

export interface ConstructionConstraints {
  readonly minimumWorlds?: number
  readonly maximumWorlds?: number
  readonly minimumEdges?: number
  readonly maximumEdges?: number
  /** Maximum semantic edits relative to the level start: world, explicit-edge, or atom-membership additions/removals. */
  readonly maximumChanges?: number
  readonly requiredEdges?: readonly AccessibilityEdge[]
  readonly forbiddenEdges?: readonly AccessibilityEdge[]
  readonly requiredAtoms?: Readonly<Record<WorldId, readonly string[]>>
  readonly forbiddenAtoms?: Readonly<Record<WorldId, readonly string[]>>
  readonly requiredProperties?: readonly FramePropertyName[]
  readonly forbiddenProperties?: readonly FramePropertyName[]
}

export interface ConstraintInput {
  readonly worldIds: readonly WorldId[]
  readonly explicitEdges: readonly AccessibilityEdge[]
  readonly effectiveEdges: readonly AccessibilityEdge[]
  readonly valuation: Readonly<Record<WorldId, readonly string[]>>
  readonly baseline?: {
    readonly worldIds: readonly WorldId[]
    readonly explicitEdges: readonly AccessibilityEdge[]
    readonly valuation: Readonly<Record<WorldId, readonly string[]>>
  }
}

const edgeKey = ({ from, to }: AccessibilityEdge) => `${from}\u0000${to}`
const relationLabel = ({ from, to }: AccessibilityEdge) => `${from}R${to}`
const symmetricDifferenceSize = <T,>(left: ReadonlySet<T>, right: ReadonlySet<T>) =>
  [...left].filter((item) => !right.has(item)).length + [...right].filter((item) => !left.has(item)).length

export function countConstructionChanges(input: ConstraintInput): number | undefined {
  if (!input.baseline) return undefined
  const atoms = (valuation: Readonly<Record<WorldId, readonly string[]>>) => new Set(
    Object.entries(valuation).flatMap(([world, entries]) => entries.map((atom) => `${world}\u0000${atom}`)),
  )
  return symmetricDifferenceSize(new Set(input.worldIds), new Set(input.baseline.worldIds))
    + symmetricDifferenceSize(new Set(input.explicitEdges.map(edgeKey)), new Set(input.baseline.explicitEdges.map(edgeKey)))
    + symmetricDifferenceSize(atoms(input.valuation), atoms(input.baseline.valuation))
}

export function checkConstructionConstraints(input: ConstraintInput, constraints: ConstructionConstraints): readonly string[] {
  const { worldIds, explicitEdges, effectiveEdges, valuation } = input
  const explicit = new Set(explicitEdges.map(edgeKey))
  const explicitEdgeCount = explicit.size
  const violations: string[] = []

  if (constraints.minimumWorlds !== undefined && worldIds.length < constraints.minimumWorlds) violations.push(`Use at least ${constraints.minimumWorlds} worlds.`)
  if (constraints.maximumWorlds !== undefined && worldIds.length > constraints.maximumWorlds) violations.push(`Use at most ${constraints.maximumWorlds} worlds.`)
  if (constraints.minimumEdges !== undefined && explicitEdgeCount < constraints.minimumEdges) violations.push(`Use at least ${constraints.minimumEdges} distinct explicit edges.`)
  if (constraints.maximumEdges !== undefined && explicitEdgeCount > constraints.maximumEdges) violations.push(`Use at most ${constraints.maximumEdges} distinct explicit edges.`)
  if (constraints.maximumChanges !== undefined) {
    const changes = countConstructionChanges(input)
    if (changes === undefined) violations.push('A change budget requires an initial model baseline.')
    else if (changes > constraints.maximumChanges) violations.push(`Use at most ${constraints.maximumChanges} semantic changes from the initial model; the current construction uses ${changes}.`)
  }

  for (const edge of constraints.requiredEdges ?? []) if (!explicit.has(edgeKey(edge))) violations.push(`Required edge ${relationLabel(edge)} is missing.`)
  for (const edge of constraints.forbiddenEdges ?? []) if (explicit.has(edgeKey(edge))) violations.push(`Edge ${relationLabel(edge)} is forbidden.`)

  for (const [world, atoms] of Object.entries(constraints.requiredAtoms ?? {})) {
    const actual = new Set(valuation[world] ?? [])
    for (const atom of atoms) if (!actual.has(atom)) violations.push(`${atom} must be true at ${world}.`)
  }
  for (const [world, atoms] of Object.entries(constraints.forbiddenAtoms ?? {})) {
    const actual = new Set(valuation[world] ?? [])
    for (const atom of atoms) if (actual.has(atom)) violations.push(`${atom} must be false at ${world}.`)
  }

  for (const property of constraints.requiredProperties ?? []) {
    if (!checkFrameProperty(worldIds, effectiveEdges, property).holds) violations.push(`The relation must be ${property}.`)
  }
  for (const property of constraints.forbiddenProperties ?? []) {
    if (checkFrameProperty(worldIds, effectiveEdges, property).holds) violations.push(`The relation must not be ${property}.`)
  }

  return violations
}

export function describeConstructionConstraints(constraints: ConstructionConstraints): readonly string[] {
  const descriptions: string[] = []
  if (constraints.minimumWorlds !== undefined && constraints.minimumWorlds === constraints.maximumWorlds) descriptions.push(`${constraints.minimumWorlds} worlds`)
  else {
    if (constraints.minimumWorlds !== undefined) descriptions.push(`≥ ${constraints.minimumWorlds} worlds`)
    if (constraints.maximumWorlds !== undefined) descriptions.push(`≤ ${constraints.maximumWorlds} worlds`)
  }
  if (constraints.minimumEdges !== undefined && constraints.minimumEdges === constraints.maximumEdges) descriptions.push(`${constraints.minimumEdges} explicit edges`)
  else {
    if (constraints.minimumEdges !== undefined) descriptions.push(`≥ ${constraints.minimumEdges} explicit edges`)
    if (constraints.maximumEdges !== undefined) descriptions.push(`≤ ${constraints.maximumEdges} explicit edges`)
  }
  if (constraints.maximumChanges !== undefined) descriptions.push(`â‰¤ ${constraints.maximumChanges} changes from start`)
  for (const edge of constraints.requiredEdges ?? []) descriptions.push(`require ${relationLabel(edge)}`)
  for (const edge of constraints.forbiddenEdges ?? []) descriptions.push(`forbid ${relationLabel(edge)}`)
  for (const [world, atoms] of Object.entries(constraints.requiredAtoms ?? {})) for (const atom of atoms) descriptions.push(`${atom} true at ${world}`)
  for (const [world, atoms] of Object.entries(constraints.forbiddenAtoms ?? {})) for (const atom of atoms) descriptions.push(`${atom} false at ${world}`)
  for (const property of constraints.requiredProperties ?? []) descriptions.push(property)
  for (const property of constraints.forbiddenProperties ?? []) descriptions.push(`not ${property}`)
  return descriptions
}
