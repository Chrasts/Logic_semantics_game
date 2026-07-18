import { formatFormula, type Formula } from './formula'
import { successors, type KripkeModel, type WorldId } from './model'

export type EvaluationRule = 'atom' | 'negation' | 'conjunction' | 'disjunction' | 'implication' | 'necessity' | 'possibility'

export interface EvaluationTrace {
  readonly formula: string
  readonly worldId: WorldId
  readonly value: boolean
  readonly rule: EvaluationRule
  readonly summary: string
  readonly diagnostic?: string
  readonly children: readonly EvaluationTrace[]
}

export interface EvaluationResult {
  readonly value: boolean
  readonly explanation: string
  readonly trace: EvaluationTrace
}

const result = (
  formula: Formula,
  worldId: WorldId,
  value: boolean,
  rule: EvaluationRule,
  explanation: string,
  children: readonly EvaluationTrace[] = [],
  diagnostic?: string,
): EvaluationResult => ({
  value,
  explanation,
  trace: { formula: formatFormula(formula), worldId, value, rule, summary: explanation, children, diagnostic },
})

/** Returns whether M, worldId ⊨ formula under standard Kripke semantics. */
export function evaluate(model: KripkeModel, worldId: WorldId, formula: Formula): boolean {
  return evaluateWithExplanation(model, worldId, formula).value
}

/** Evaluates a formula and records every semantically relevant recursive step. */
export function evaluateWithExplanation(
  model: KripkeModel,
  worldId: WorldId,
  formula: Formula,
): EvaluationResult {
  const world = model.worlds.get(worldId)
  if (!world) throw new Error(`Unknown world: ${worldId}`)

  switch (formula.kind) {
    case 'atom': {
      const value = world.valuation.has(formula.name)
      return result(formula, worldId, value, 'atom', `${formula.name} ${value ? 'belongs' : 'does not belong'} to the valuation at ${worldId}.`)
    }
    case 'not': {
      const operand = evaluateWithExplanation(model, worldId, formula.operand)
      return result(formula, worldId, !operand.value, 'negation', `¬${formatFormula(formula.operand)} reverses the truth value: ${operand.explanation}`, [operand.trace])
    }
    case 'and': {
      const left = evaluateWithExplanation(model, worldId, formula.left)
      const right = evaluateWithExplanation(model, worldId, formula.right)
      const value = left.value && right.value
      const explanation = value
        ? `Both conjuncts are true at ${worldId}.`
        : `The conjunction is false because ${!left.value ? left.explanation : right.explanation}`
      return result(formula, worldId, value, 'conjunction', explanation, [left.trace, right.trace], value ? undefined : 'At least one conjunct must be made true.')
    }
    case 'or': {
      const left = evaluateWithExplanation(model, worldId, formula.left)
      const right = evaluateWithExplanation(model, worldId, formula.right)
      const value = left.value || right.value
      const explanation = value
        ? `The disjunction is true because ${left.value ? left.explanation : right.explanation}`
        : `Neither disjunct is true at ${worldId}.`
      return result(formula, worldId, value, 'disjunction', explanation, [left.trace, right.trace], value ? undefined : 'At least one disjunct needs to be true.')
    }
    case 'implies': {
      const left = evaluateWithExplanation(model, worldId, formula.left)
      const right = evaluateWithExplanation(model, worldId, formula.right)
      const value = !left.value || right.value
      const explanation = !left.value
        ? `The implication is true because its antecedent is false at ${worldId}.`
        : right.value
          ? `The implication is true because its consequent is true at ${worldId}.`
          : `The implication is false: its antecedent is true but its consequent is false at ${worldId}.`
      return result(formula, worldId, value, 'implication', explanation, [left.trace, right.trace], value ? undefined : 'This is the unique failing pattern for material implication: true antecedent, false consequent.')
    }
    case 'box': {
      const nextWorlds = successors(model, worldId)
      if (nextWorlds.length === 0) {
        return result(formula, worldId, true, 'necessity', `□${formatFormula(formula.operand)} is vacuously true at ${worldId}, because the world has no successors.`, [], 'No successor can violate the boxed formula; no witness world is required for □.')
      }
      const checks = nextWorlds.map((next) => evaluateWithExplanation(model, next, formula.operand))
      const failingIndex = checks.findIndex(({ value }) => !value)
      if (failingIndex >= 0) {
        const failingWorld = nextWorlds[failingIndex]
        return result(formula, worldId, false, 'necessity', `□${formatFormula(formula.operand)} is false: ${worldId} R ${failingWorld}, and the formula is false at ${failingWorld}.`, checks.map(({ trace }) => trace), `${failingWorld} is a counterexample successor. Every accessible world must satisfy the operand of □.`)
      }
      return result(formula, worldId, true, 'necessity', `□${formatFormula(formula.operand)} is true at all ${nextWorlds.length} worlds accessible from ${worldId}.`, checks.map(({ trace }) => trace))
    }
    case 'diamond': {
      const nextWorlds = successors(model, worldId)
      const checks = nextWorlds.map((next) => evaluateWithExplanation(model, next, formula.operand))
      const witnessIndex = checks.findIndex(({ value }) => value)
      if (witnessIndex >= 0) {
        const witnessWorld = nextWorlds[witnessIndex]
        return result(formula, worldId, true, 'possibility', `◇${formatFormula(formula.operand)} is true: ${worldId} R ${witnessWorld}, and the formula is true at ${witnessWorld}.`, checks.map(({ trace }) => trace), `${witnessWorld} is a witness successor for ◇.`)
      }
      const explanation = nextWorlds.length === 0
        ? `◇${formatFormula(formula.operand)} is false because ${worldId} has no successors.`
        : `◇${formatFormula(formula.operand)} is false at every world accessible from ${worldId}.`
      const diagnostic = nextWorlds.length === 0
        ? 'Possibility requires at least one accessible witness world.'
        : 'None of the accessible worlds satisfies the operand; ◇ needs one witness.'
      return result(formula, worldId, false, 'possibility', explanation, checks.map(({ trace }) => trace), diagnostic)
    }
  }
}
