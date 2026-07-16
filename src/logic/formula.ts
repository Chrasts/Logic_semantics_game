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

