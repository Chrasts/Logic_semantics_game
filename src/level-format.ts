import type { GameLevel, LevelEditPermission } from './campaign'
import { assertCompatibleAuthoredConstraints } from './author-constraints'
import {
  applyFrameProperties,
  checkConstructionConstraints,
  checkFrameProperty,
  parseFormula,
  verifyObjective,
  type ConstructionConstraints,
  type FramePropertyName,
  type ObjectiveScope,
} from './logic'

export const CUSTOM_LEVEL_FORMAT = 'logic-model-builder-level'
export const CUSTOM_LEVEL_VERSION = 1

export interface CustomLevelFile {
  readonly format: typeof CUSTOM_LEVEL_FORMAT
  readonly version: typeof CUSTOM_LEVEL_VERSION
  readonly level: GameLevel
  readonly referenceSolution?: ReferenceSolution
}

export interface ReferenceSolution {
  readonly worlds: GameLevel['worlds']
  readonly edges: GameLevel['edges']
  readonly evaluationWorld: string
  readonly frameRules?: GameLevel['frameRules']
}

export interface ParsedCustomLevelFile {
  readonly level: GameLevel
  readonly referenceSolution?: ReferenceSolution
}

const scopes = new Set<ObjectiveScope>(['pointed', 'model', 'frame', 'correspondence'])
const editPermissions = new Set<LevelEditPermission>(['worlds', 'valuations', 'edges', 'constraints', 'evaluation'])
const frameProperties = new Set<FramePropertyName>(['reflexive', 'symmetric', 'transitive', 'euclidean', 'serial', 'irreflexive', 'acyclic'])
const enforceableProperties = new Set<FramePropertyName>(['reflexive', 'symmetric', 'transitive', 'euclidean'])

const object = (value: unknown, message: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message)
  return value as Record<string, unknown>
}

export function serializeCustomLevel(level: GameLevel, referenceSolution?: ReferenceSolution): string {
  return JSON.stringify({ format: CUSTOM_LEVEL_FORMAT, version: CUSTOM_LEVEL_VERSION, level, referenceSolution } satisfies CustomLevelFile, null, 2)
}

export function parseCustomLevelPackage(value: unknown): ParsedCustomLevelFile {
  const file = object(value, 'Invalid custom mission file.')
  if (file.format !== CUSTOM_LEVEL_FORMAT || file.version !== CUSTOM_LEVEL_VERSION) throw new Error('Unsupported custom mission format or version.')
  const source = object(file.level, 'The custom mission definition is missing.')
  const requiredText = (key: string) => {
    const text = source[key]
    if (typeof text !== 'string' || !text.trim()) throw new Error(`Custom mission field “${key}” is required.`)
    return text.trim()
  }
  const formula = requiredText('formula')
  parseFormula(formula)
  if (!scopes.has(source.scope as ObjectiveScope)) throw new Error('Invalid custom mission objective scope.')
  const correspondencePreset = typeof source.correspondencePreset === 'string' && ['t', 'd', 'b', '4', '5'].includes(source.correspondencePreset)
    ? source.correspondencePreset as GameLevel['correspondencePreset']
    : undefined
  if (source.scope === 'correspondence' && !correspondencePreset) throw new Error('A correspondence mission needs a supported axiom preset.')
  if (typeof source.targetTruth !== 'boolean') throw new Error('Custom mission targetTruth must be Boolean.')
  if (!Array.isArray(source.worlds) || source.worlds.length === 0) throw new Error('A custom mission needs at least one world.')
  const worlds = source.worlds.map((item, index) => {
    const world = object(item, 'Invalid custom mission world.')
    if (typeof world.id !== 'string' || !world.id.trim() || typeof world.atoms !== 'string') throw new Error('Every custom mission world needs an id and atom list.')
    const atoms = world.atoms.split(/[\s,]+/u).filter(Boolean)
    if (atoms.some((atom) => !/^[A-Za-z][A-Za-z0-9_]*$/u.test(atom))) throw new Error(`Invalid atom list at ${world.id}.`)
    const position = object(world.position ?? {}, 'Invalid custom mission world position.')
    return { id: world.id.trim(), atoms: world.atoms, position: { x: typeof position.x === 'number' ? position.x : 90 + index * 220, y: typeof position.y === 'number' ? position.y : 130 } }
  })
  const ids = worlds.map(({ id }) => id)
  if (new Set(ids).size !== ids.length) throw new Error('Custom mission world ids must be unique.')
  if (!Array.isArray(source.edges)) throw new Error('Invalid custom mission relation.')
  const edges = source.edges.map((item) => {
    const edge = object(item, 'Invalid custom mission edge.')
    if (typeof edge.from !== 'string' || typeof edge.to !== 'string' || !ids.includes(edge.from) || !ids.includes(edge.to)) throw new Error('A custom mission edge references an unknown world.')
    return { from: edge.from, to: edge.to }
  })
  const parseConstraints = (value: unknown, label: string): ConstructionConstraints | undefined => {
    if (value === undefined) return undefined
    const raw = object(value, `Invalid ${label}.`)
    const count = (key: keyof ConstructionConstraints) => {
      const entry = raw[key]
      if (entry === undefined) return undefined
      if (typeof entry !== 'number' || !Number.isInteger(entry) || entry < 0) throw new Error(`${label} ${key} must be a non-negative integer.`)
      return entry
    }
    const relationList = (key: 'requiredEdges' | 'forbiddenEdges') => {
      const list = raw[key]
      if (list === undefined) return undefined
      if (!Array.isArray(list)) throw new Error(`Invalid ${label} ${key}.`)
      return list.map((item) => {
        const edge = object(item, `Invalid ${label} edge.`)
        if (typeof edge.from !== 'string' || typeof edge.to !== 'string' || !ids.includes(edge.from) || !ids.includes(edge.to)) throw new Error(`${label} references an unknown world.`)
        return { from: edge.from, to: edge.to }
      })
    }
    const propertyList = (key: 'requiredProperties' | 'forbiddenProperties') => {
      const list = raw[key]
      if (list === undefined) return undefined
      if (!Array.isArray(list) || list.some((entry) => !frameProperties.has(entry as FramePropertyName))) throw new Error(`Invalid ${label} ${key}.`)
      return list as FramePropertyName[]
    }
    const atomMap = (key: 'requiredAtoms' | 'forbiddenAtoms') => {
      const map = raw[key]
      if (map === undefined) return undefined
      const entries = object(map, `Invalid ${label} ${key}.`)
      return Object.fromEntries(Object.entries(entries).map(([world, atoms]) => {
        if (!ids.includes(world) || !Array.isArray(atoms) || atoms.some((atom) => typeof atom !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/u.test(atom))) throw new Error(`Invalid ${label} atom constraint.`)
        return [world, atoms as string[]]
      }))
    }
    const result: ConstructionConstraints = {
      minimumWorlds: count('minimumWorlds'), maximumWorlds: count('maximumWorlds'),
      minimumEdges: count('minimumEdges'), maximumEdges: count('maximumEdges'),
      requiredEdges: relationList('requiredEdges'), forbiddenEdges: relationList('forbiddenEdges'),
      requiredAtoms: atomMap('requiredAtoms'), forbiddenAtoms: atomMap('forbiddenAtoms'),
      requiredProperties: propertyList('requiredProperties'), forbiddenProperties: propertyList('forbiddenProperties'),
    }
    if (result.minimumWorlds !== undefined && result.maximumWorlds !== undefined && result.minimumWorlds > result.maximumWorlds) throw new Error(`${label} world bounds are inconsistent.`)
    if (result.minimumEdges !== undefined && result.maximumEdges !== undefined && result.minimumEdges > result.maximumEdges) throw new Error(`${label} edge bounds are inconsistent.`)
    return Object.fromEntries(Object.entries(result).filter(([, entry]) => entry !== undefined)) as ConstructionConstraints
  }
  if (typeof source.evaluationWorld !== 'string' || !ids.includes(source.evaluationWorld)) throw new Error('The custom mission evaluation world must exist.')
  if (!Array.isArray(source.editable) || source.editable.some((entry) => !editPermissions.has(entry as LevelEditPermission))) throw new Error('Invalid custom mission edit permissions.')
  const frameRulesSource = source.frameRules === undefined ? undefined : object(source.frameRules, 'Invalid custom mission frame rules.')
  const frameRules = frameRulesSource && Object.fromEntries(Object.entries(frameRulesSource).map(([property, mode]) => {
    if (!frameProperties.has(property as FramePropertyName) || !['off', 'validate', 'enforce'].includes(String(mode)) || (mode === 'enforce' && !enforceableProperties.has(property as FramePropertyName))) throw new Error('Invalid custom mission frame rule.')
    return [property, mode]
  })) as GameLevel['frameRules']
  const predictionSource = source.prediction === undefined ? undefined : object(source.prediction, 'Invalid custom mission prediction.')
  const prediction = predictionSource ? {
    kind: predictionSource.kind,
    prompt: predictionSource.prompt,
  } : undefined
  if (prediction && !['truth', 'counterexample-world'].includes(String(prediction.kind))) throw new Error('Invalid custom mission prediction kind.')
  if (prediction && (typeof prediction.prompt !== 'string' || !prediction.prompt.trim())) throw new Error('A custom mission prediction needs a prompt.')
  if (prediction?.kind === 'counterexample-world' && source.scope !== 'model') throw new Error('Counterexample-world prediction requires model-global scope.')
  const constraints = parseConstraints(source.constraints, 'custom mission constraints')
  const bonusConstraints = parseConstraints(source.bonusConstraints, 'custom mission bonus constraints')
  if (constraints) assertCompatibleAuthoredConstraints(constraints)
  if (bonusConstraints) assertCompatibleAuthoredConstraints(bonusConstraints)
  const level: GameLevel = {
    id: requiredText('id'), chapter: requiredText('chapter'), title: requiredText('title'), concept: requiredText('concept'),
    briefing: typeof source.briefing === 'string' ? source.briefing : undefined,
    learningObjective: typeof source.learningObjective === 'string' ? source.learningObjective : undefined,
    instruction: requiredText('instruction'), formula, scope: source.scope as ObjectiveScope,
    targetTruth: source.targetTruth, evaluationWorld: source.evaluationWorld,
    correspondencePreset, worlds, edges, frameRules,
    constraints, bonusConstraints,
    prediction: prediction as GameLevel['prediction'], editable: source.editable as LevelEditPermission[],
  }
  const referenceSolution = file.referenceSolution === undefined ? undefined : parseReferenceSolution(file.referenceSolution)
  if (referenceSolution) assertValidReferenceSolution(level, referenceSolution)
  return { level, referenceSolution }
}

export function parseCustomLevelFile(value: unknown): GameLevel {
  return parseCustomLevelPackage(value).level
}

function parseReferenceSolution(value: unknown): ReferenceSolution {
  const source = object(value, 'Invalid reference solution.')
  if (!Array.isArray(source.worlds) || source.worlds.length === 0) throw new Error('A reference solution needs at least one world.')
  const worlds = source.worlds.map((item, index) => {
    const world = object(item, 'Invalid reference-solution world.')
    if (typeof world.id !== 'string' || !world.id.trim() || typeof world.atoms !== 'string') throw new Error('Every reference-solution world needs an id and atom list.')
    const atoms = world.atoms.split(/[\s,]+/u).filter(Boolean)
    if (atoms.some((atom) => !/^[A-Za-z][A-Za-z0-9_]*$/u.test(atom))) throw new Error(`Invalid atom list at ${world.id}.`)
    const position = object(world.position ?? {}, 'Invalid reference-solution world position.')
    return { id: world.id.trim(), atoms: world.atoms, position: { x: typeof position.x === 'number' ? position.x : 90 + index * 220, y: typeof position.y === 'number' ? position.y : 130 } }
  })
  const ids = worlds.map(({ id }) => id)
  if (new Set(ids).size !== ids.length) throw new Error('Reference-solution world ids must be unique.')
  if (!Array.isArray(source.edges)) throw new Error('Invalid reference-solution relation.')
  const edges = source.edges.map((item) => {
    const edge = object(item, 'Invalid reference-solution edge.')
    if (typeof edge.from !== 'string' || typeof edge.to !== 'string' || !ids.includes(edge.from) || !ids.includes(edge.to)) throw new Error('A reference-solution edge references an unknown world.')
    return { from: edge.from, to: edge.to }
  })
  if (typeof source.evaluationWorld !== 'string' || !ids.includes(source.evaluationWorld)) throw new Error('The reference-solution evaluation world must exist.')
  const rulesSource = source.frameRules === undefined ? undefined : object(source.frameRules, 'Invalid reference-solution frame rules.')
  const frameRules = rulesSource && Object.fromEntries(Object.entries(rulesSource).map(([property, mode]) => {
    if (!frameProperties.has(property as FramePropertyName) || !['off', 'validate', 'enforce'].includes(String(mode)) || (mode === 'enforce' && !enforceableProperties.has(property as FramePropertyName))) throw new Error('Invalid reference-solution frame rule.')
    return [property, mode]
  })) as GameLevel['frameRules']
  return { worlds, edges, evaluationWorld: source.evaluationWorld, frameRules }
}

const correspondenceProperties: Readonly<Record<NonNullable<GameLevel['correspondencePreset']>, FramePropertyName>> = {
  t: 'reflexive', d: 'serial', b: 'symmetric', 4: 'transitive', 5: 'euclidean',
}

export function assertValidReferenceSolution(level: GameLevel, solution: ReferenceSolution): void {
  const worldIds = solution.worlds.map(({ id }) => id)
  const rules = solution.frameRules ?? level.frameRules ?? {}
  const effectiveEdges = applyFrameProperties(worldIds, solution.edges, {
    reflexive: rules.reflexive === 'enforce', symmetric: rules.symmetric === 'enforce',
    transitive: rules.transitive === 'enforce', euclidean: rules.euclidean === 'enforce',
  })
  const valuation = Object.fromEntries(solution.worlds.map(({ id, atoms }) => [id, atoms.split(/[\s,]+/u).filter(Boolean)]))
  const violations = level.constraints ? [...checkConstructionConstraints({ worldIds, explicitEdges: solution.edges, effectiveEdges, valuation }, level.constraints)] : []
  for (const [property, mode] of Object.entries(rules)) {
    if (mode !== 'off' && !checkFrameProperty(worldIds, effectiveEdges, property as FramePropertyName).holds) violations.push(`The ${property} frame rule is not satisfied.`)
  }
  for (const [property, mode] of Object.entries(level.requiredFrameRules ?? {})) {
    if (rules[property as FramePropertyName] !== mode) violations.push(`${property} must be set to ${mode}.`)
  }
  if (violations.length) throw new Error(`Reference solution is invalid: ${violations[0]}`)
  const verdict = verifyObjective({
    scope: level.scope, targetTruth: level.targetTruth, evaluationWorld: solution.evaluationWorld,
    correspondenceProperty: level.correspondencePreset ? correspondenceProperties[level.correspondencePreset] : undefined,
  }, { worldIds, edges: effectiveEdges, valuation, formula: parseFormula(level.formula) })
  if (!verdict.success) throw new Error(`Reference solution does not meet the objective: ${verdict.formula.detail}`)
}
