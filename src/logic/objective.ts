import { evaluateWithExplanation, type EvaluationTrace } from './evaluate'
import { checkFrameProperty, type FramePropertyName } from './frame'
import { and, formatFormula, implies, type Formula } from './formula'
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
  readonly comparisonFormula?: Formula
}

export interface VerdictSection {
  readonly label: string
  readonly holds: boolean
  readonly summary: string
  readonly detail: string
  readonly truthByWorld?: readonly { readonly worldId: WorldId; readonly value: boolean }[]
  readonly witnessValuation?: Readonly<Record<WorldId, readonly string[]>>
  readonly evaluationTraces?: readonly EvaluationTrace[]
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
  const { worldIds, edges, valuation, formula, comparisonFormula } = input
  const truthByWorld = (activeValuation: Readonly<Record<WorldId, readonly string[]>>) => {
    const model = createModel(activeValuation, edges)
    return worldIds.map((worldId) => ({ worldId, value: evaluateWithExplanation(model, worldId, formula).value }))
  }

  if (comparisonFormula) {
    if (definition.scope === 'correspondence') throw new Error('Formula equivalence is not a correspondence objective.')
    const leftLabel = formatFormula(formula)
    const rightLabel = formatFormula(comparisonFormula)
    const model = createModel(valuation, edges)
    const compareAt = (worldId: WorldId, activeModel = model) => {
      const left = evaluateWithExplanation(activeModel, worldId, formula)
      const right = evaluateWithExplanation(activeModel, worldId, comparisonFormula)
      return { worldId, equivalent: left.value === right.value, left, right }
    }
    if (definition.scope === 'pointed') {
      const world = definition.evaluationWorld
      if (!world || !worldIds.includes(world)) throw new Error('Select an existing evaluation world.')
      const comparison = compareAt(world)
      const success = comparison.equivalent === definition.targetTruth
      return {
        success, headline: success ? 'Objective met' : 'Objective not met',
        formula: {
          label: 'Pointed equivalence', holds: comparison.equivalent,
          summary: `${leftLabel} and ${rightLabel} are ${comparison.equivalent ? 'equivalent' : 'different'} at ${world}.`,
          detail: `${leftLabel} is ${comparison.left.value ? 'true' : 'false'}; ${rightLabel} is ${comparison.right.value ? 'true' : 'false'} at ${world}.`,
          truthByWorld: worldIds.map((worldId) => ({ worldId, value: compareAt(worldId).equivalent })),
          evaluationTraces: [comparison.left.trace, comparison.right.trace],
        },
      }
    }
    if (definition.scope === 'model') {
      const comparisons = worldIds.map((worldId) => compareAt(worldId))
      const counterexample = comparisons.find(({ equivalent }) => !equivalent)
      const equivalent = !counterexample
      const success = equivalent === definition.targetTruth
      return {
        success, headline: success ? 'Objective met' : 'Objective not met',
        formula: {
          label: 'Model-global equivalence', holds: equivalent,
          summary: equivalent ? 'The formulas agree at every world under the current valuation.' : `The formulas differ at ${counterexample!.worldId}.`,
          detail: counterexample
            ? `${leftLabel} is ${counterexample.left.value ? 'true' : 'false'}, while ${rightLabel} is ${counterexample.right.value ? 'true' : 'false'} at ${counterexample.worldId}.`
            : `Compared both formulas at all ${worldIds.length} worlds under the displayed valuation.`,
          truthByWorld: comparisons.map(({ worldId, equivalent: value }) => ({ worldId, value })),
          evaluationTraces: counterexample ? [counterexample.left.trace, counterexample.right.trace] : undefined,
        },
      }
    }
    const biconditional = and(implies(formula, comparisonFormula), implies(comparisonFormula, formula))
    const frameEquivalence = checkFrameValidity(worldIds, edges, biconditional)
    const counterexample = frameEquivalence.counterexample
    const counterModel = counterexample ? createModel(counterexample.valuation, edges) : undefined
    const comparison = counterexample && counterModel ? compareAt(counterexample.worldId, counterModel) : undefined
    const success = frameEquivalence.valid === definition.targetTruth
    return {
      success, headline: success ? 'Objective met' : 'Objective not met',
      formula: {
        label: 'Frame equivalence', holds: frameEquivalence.valid,
        summary: frameEquivalence.valid ? 'Equivalent at every world under every valuation on this frame.' : `A countervaluation distinguishes the formulas at ${counterexample!.worldId}.`,
        detail: comparison
          ? `${leftLabel} is ${comparison.left.value ? 'true' : 'false'}, while ${rightLabel} is ${comparison.right.value ? 'true' : 'false'} at ${comparison.worldId}. Countervaluation: ${formatCountervaluation(counterexample!)}.`
          : `Checked all ${frameEquivalence.checkedValuations.toLocaleString('en-US')} valuations at every world.`,
        witnessValuation: counterexample?.valuation,
        evaluationTraces: comparison ? [comparison.left.trace, comparison.right.trace] : undefined,
      },
    }
  }

  if (definition.scope === 'pointed') {
    const world = definition.evaluationWorld
    if (!world || !worldIds.includes(world)) throw new Error('Select an existing evaluation world.')
    const evaluation = evaluateWithExplanation(createModel(valuation, edges), world, formula)
    const success = evaluation.value === definition.targetTruth
    const worldTruth = truthByWorld(valuation)
    const matchingElsewhere = !success ? worldTruth.find(({ worldId, value }) => worldId !== world && value === definition.targetTruth) : undefined
    const failureGuidance = !success
      ? [
          matchingElsewhere ? `The objective is pointed: matching the target at ${matchingElsewhere.worldId} does not satisfy the requirement at ${world}.` : undefined,
          evaluation.trace.diagnostic,
        ].filter(Boolean).join(' ')
      : ''
    return {
      success,
      headline: success ? 'Objective met' : 'Objective not met',
      formula: {
        label: 'Pointed model',
        holds: evaluation.value,
        summary: `The formula is ${evaluation.value ? 'true' : 'false'} at ${world}.`,
        detail: `${evaluation.explanation}${failureGuidance ? ` ${failureGuidance}` : ''}`,
        truthByWorld: worldTruth,
        evaluationTraces: [evaluation.trace],
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
          : `The formula is true at all ${worldIds.length} worlds.${success ? '' : ' A model-global counterexample requires the formula to fail at least at one world under this fixed valuation.'}`,
        truthByWorld: truthByWorld(valuation),
        evaluationTraces: evaluation.counterexample
          ? [evaluation.counterexample.explanation.trace]
          : worldIds.map((worldId) => evaluateWithExplanation(createModel(valuation, edges), worldId, formula).trace),
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
      : `Checked all ${frameValidity.checkedValuations.toLocaleString('en-US')} valuations at every world.${definition.scope === 'frame' && !definition.targetTruth ? ' The displayed valuation alone cannot refute frame validity; a countervaluation must exist.' : ''}`,
    truthByWorld: truthByWorld(frameValidity.counterexample?.valuation ?? valuation),
    witnessValuation: frameValidity.counterexample?.valuation,
    evaluationTraces: frameValidity.counterexample ? [frameValidity.counterexample.explanation.trace] : undefined,
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
    headline: agrees ? 'Formula and relation agree on this frame' : 'Formula and relation disagree on this frame',
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
      detail: 'This compares both sides on the current finite frame; it is an instance check, not a proof of the general frame correspondence.',
    },
  }
}
