import { evaluate, type EvaluationResult, evaluateWithExplanation } from './evaluate'
import { collectAtoms, type Formula } from './formula'
import { createModel, type AccessibilityEdge, type KripkeModel, type WorldId } from './model'

export interface ModelValidityResult {
  readonly valid: boolean
  readonly counterexample?: { readonly worldId: WorldId; readonly explanation: EvaluationResult }
}

export interface FrameCounterexample {
  readonly worldId: WorldId
  readonly valuation: Readonly<Record<WorldId, readonly string[]>>
  readonly explanation: EvaluationResult
}

export interface FrameValidityResult {
  readonly valid: boolean
  readonly checkedValuations: number
  readonly counterexample?: FrameCounterexample
}

export function evaluateAtAllWorlds(model: KripkeModel, formula: Formula): ModelValidityResult {
  for (const worldId of model.worlds.keys()) {
    const explanation = evaluateWithExplanation(model, worldId, formula)
    if (!explanation.value) return { valid: false, counterexample: { worldId, explanation } }
  }
  return { valid: true }
}

export function checkFrameValidity(
  worldIds: readonly WorldId[],
  edges: readonly AccessibilityEdge[],
  formula: Formula,
  maximumValuations = 1_048_576,
): FrameValidityResult {
  const atoms = collectAtoms(formula)
  const slots = worldIds.length * atoms.length
  const valuationCount = 2 ** slots
  if (!Number.isSafeInteger(valuationCount) || valuationCount > maximumValuations) {
    throw new Error(`Frame validity requires ${valuationCount.toLocaleString('en-US')} valuations; the current limit is ${maximumValuations.toLocaleString('en-US')}.`)
  }

  for (let assignment = 0; assignment < valuationCount; assignment += 1) {
    const valuation: Record<WorldId, string[]> = Object.fromEntries(worldIds.map((world) => [world, []]))
    let bits = assignment
    for (const world of worldIds) {
      for (const atom of atoms) {
        if (bits % 2 === 1) valuation[world].push(atom)
        bits = Math.floor(bits / 2)
      }
    }

    const model = createModel(valuation, edges)
    for (const worldId of worldIds) {
      if (!evaluate(model, worldId, formula)) {
        return {
          valid: false,
          checkedValuations: assignment + 1,
          counterexample: {
            worldId,
            valuation,
            explanation: evaluateWithExplanation(model, worldId, formula),
          },
        }
      }
    }
  }
  return { valid: true, checkedValuations: valuationCount }
}

