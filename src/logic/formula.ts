/** Abstract syntax tree of the supported basic modal language. */
export type Formula =
  | { readonly kind: 'atom'; readonly name: string }
  | { readonly kind: 'not'; readonly operand: Formula }
  | { readonly kind: 'and'; readonly left: Formula; readonly right: Formula }
  | { readonly kind: 'or'; readonly left: Formula; readonly right: Formula }
  | { readonly kind: 'implies'; readonly left: Formula; readonly right: Formula }
  | { readonly kind: 'box'; readonly operand: Formula }
  | { readonly kind: 'diamond'; readonly operand: Formula }

export const atom = (name: string): Formula => {
  if (!name.trim()) throw new Error('Atom name must not be empty.')
  return { kind: 'atom', name }
}

export const not = (operand: Formula): Formula => ({ kind: 'not', operand })
export const and = (left: Formula, right: Formula): Formula => ({ kind: 'and', left, right })
export const or = (left: Formula, right: Formula): Formula => ({ kind: 'or', left, right })
export const implies = (left: Formula, right: Formula): Formula => ({ kind: 'implies', left, right })
export const box = (operand: Formula): Formula => ({ kind: 'box', operand })
export const diamond = (operand: Formula): Formula => ({ kind: 'diamond', operand })

const precedence: Readonly<Record<Formula['kind'], number>> = {
  atom: 5,
  not: 4,
  box: 4,
  diamond: 4,
  and: 3,
  or: 2,
  implies: 1,
}

/** Formats an AST using the canonical Unicode notation. */
export function formatFormula(formula: Formula, parentPrecedence = 0): string {
  const ownPrecedence = precedence[formula.kind]
  let formatted: string

  switch (formula.kind) {
    case 'atom': formatted = formula.name; break
    case 'not': formatted = `¬${formatFormula(formula.operand, ownPrecedence)}`; break
    case 'box': formatted = `□${formatFormula(formula.operand, ownPrecedence)}`; break
    case 'diamond': formatted = `◇${formatFormula(formula.operand, ownPrecedence)}`; break
    case 'and': formatted = `${formatFormula(formula.left, ownPrecedence)} ∧ ${formatFormula(formula.right, ownPrecedence + 1)}`; break
    case 'or': formatted = `${formatFormula(formula.left, ownPrecedence)} ∨ ${formatFormula(formula.right, ownPrecedence + 1)}`; break
    case 'implies': formatted = `${formatFormula(formula.left, ownPrecedence + 1)} → ${formatFormula(formula.right, ownPrecedence)}`; break
  }

  return ownPrecedence < parentPrecedence ? `(${formatted})` : formatted
}

export function collectAtoms(formula: Formula): readonly string[] {
  const names = new Set<string>()
  const visit = (current: Formula): void => {
    switch (current.kind) {
      case 'atom': names.add(current.name); break
      case 'not':
      case 'box':
      case 'diamond': visit(current.operand); break
      case 'and':
      case 'or':
      case 'implies': visit(current.left); visit(current.right); break
    }
  }
  visit(formula)
  return [...names].sort()
}
