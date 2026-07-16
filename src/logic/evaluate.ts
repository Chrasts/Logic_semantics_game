import type { Formula } from './formula'
import { successors, type KripkeModel, type WorldId } from './model'

/** Returns whether M, worldId |= formula under standard Kripke semantics. */
export function evaluate(model: KripkeModel, worldId: WorldId, formula: Formula): boolean {
  const world = model.worlds.get(worldId)
  if (!world) throw new Error(`Unknown world: ${worldId}`)

  switch (formula.kind) {
    case 'atom':
      return world.valuation.has(formula.name)
    case 'not':
      return !evaluate(model, worldId, formula.operand)
    case 'and':
      return evaluate(model, worldId, formula.left) && evaluate(model, worldId, formula.right)
    case 'or':
      return evaluate(model, worldId, formula.left) || evaluate(model, worldId, formula.right)
    case 'implies':
      return !evaluate(model, worldId, formula.left) || evaluate(model, worldId, formula.right)
    case 'box':
      return successors(model, worldId).every((next) => evaluate(model, next, formula.operand))
    case 'diamond':
      return successors(model, worldId).some((next) => evaluate(model, next, formula.operand))
  }
}

