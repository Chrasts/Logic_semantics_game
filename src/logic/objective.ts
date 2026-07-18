import { evaluateWithExplanation } from './evaluate'
import { checkFrameProperty, type FramePropertyName } from './frame'
import type { Formula } from './formula'
import { createModel, type AccessibilityEdge, type WorldId } from './model'
import { checkFrameValidity, evaluateAtAllWorlds, type FrameCounterexample } from './validity'

export type ObjectiveScope = 'pointed' | 'model' | 'frame' | 'correspondence'

export interface ObjectiveDefinition {
  readonly scope: ObjectiveScope
  readonly targetTruth: boolean
  readonly evaluationWorld?: WorldId
  readonly correspondenceProperty?: FramePropertyName
}

export interface ObjectiveInput {
  readonly worldIds: readonly WorldId[]
  readonly edges: readonly AccessibilityEdge[]
  readonly valuation: Readonly<Record<WorldId, readonly string[]>>
  readonly formula: Formula
}

export interface VerdictSection {
  readonly label: string
  readonly holds: boolean
  readonly summary: string
  readonly detail: string
}

export interface ObjectiveVerdict {
  readonly success: boolean
  readonly headline: string
  readonly formula: VerdictSection
  readonly relation?: VerdictSection
  readonly correspondence?: VerdictSection
}

const formatCountervaluation = (counterexample: FrameCounterexample) => Object.entries(counterexample.valuation)
  .map(([world, atoms]) => `${world}: ${atoms.length ? `{${atoms.join(', ')}}` : '∅'}`)
  .join('; ')

export function verifyObjective(definition: ObjectiveDefinition, input: ObjectiveInput): ObjectiveVerdict {
  const { worldIds, edges, valuation, formula } = input

  if (definition.scope === 'pointed') {
    const world = definition.evaluationWorld
    if (!world || !worldIds.includes(world)) throw new Error('Select an existing evaluation world.')
    const evaluation = evaluateWithExplanation(createModel(valuation, edges), world, formula)
    const success = evaluation.value === definition.targetTruth
    return {
      success,
      headline: success ? 'Objective met' : 'Objective not met',
      formula: {
        label: 'Pointed model',
        holds: evaluation.value,
        summary: `The formula is ${evaluation.value ? 'true' : 'false'} at ${world}.`,
        detail: evaluation.explanation,
      },
    }
  }

  if (definition.scope === 'model') {
    const evaluation = evaluateAtAllWorlds(createModel(valuation, edges), formula)
    const success = evaluation.valid === definition.targetTruth
    return {
      success,
      headline: success ? 'Objective met' : 'Objective not met',
      formula: {
        label: 'Model-global truth',
        holds: evaluation.valid,
        summary: evaluation.valid ? 'True at every world under the current valuation.' : 'False at some world under the current valuation.',
        detail: evaluation.counterexample
          ? `Counterexample at ${evaluation.counterexample.worldId}. ${evaluation.counterexample.explanation.explanation}`
          : `The formula is true at all ${worldIds.length} worlds.`,
      },
    }
  }

  const frameValidity = checkFrameValidity(worldIds, edges, formula)
  const formulaSection: VerdictSection = {
    label: 'Frame validity',
    holds: frameValidity.valid,
    summary: frameValidity.valid ? 'Valid at every world under every valuation.' : 'Not valid on this frame.',
    detail: frameValidity.counterexample
      ? `Countervaluation at ${frameValidity.counterexample.worldId}: ${formatCountervaluation(frameValidity.counterexample)}. ${frameValidity.counterexample.explanation.explanation}`
      : `Checked all ${frameValidity.checkedValuations.toLocaleString('en-US')} valuations at every world.`,
  }

  if (definition.scope === 'frame') {
    const success = frameValidity.valid === definition.targetTruth
    return { success, headline: success ? 'Objective met' : 'Objective not met', formula: formulaSection }
  }

  if (!definition.correspondenceProperty) throw new Error('Choose a correspondence axiom and relational property.')
  const property = checkFrameProperty(worldIds, edges, definition.correspondenceProperty)
  const agrees = frameValidity.valid === property.holds
  return {
    success: agrees,
    headline: agrees ? 'Correspondence confirmed on this frame' : 'Formula and relation disagree on this frame',
    formula: formulaSection,
    relation: {
      label: 'Relational property',
      holds: property.holds,
      summary: `The frame is ${property.holds ? '' : 'not '}${property.property}.`,
      detail: property.holds ? `The relation satisfies ${property.property}.` : property.violations[0] ?? `The relation violates ${property.property}.`,
    },
    correspondence: {
      label: 'Instance comparison',
      holds: agrees,
      summary: agrees ? 'Both sides have the same truth value.' : 'The two sides have different truth values.',
      detail: 'This verifies the equivalence on the current finite frame; it is evidence, not a proof for every frame.',
    },
  }
}
