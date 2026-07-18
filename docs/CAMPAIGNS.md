# Campaign Guide

This document describes the playable campaign structure without revealing
solutions. The in-game Tutorial should be completed first if the editor or its
semantic scopes are unfamiliar.

## Local Models & Countermodels

Pointed objectives evaluate a formula at one designated world under the current
valuation. These missions emphasize satisfiability, countermodel construction,
and the interaction between universal and existential modal operators.

1. **Necessary, not actual** — satisfy `□p ∧ ¬p` under a seriality constraint.
2. **Split the alternatives** — refute `□(p ∨ q) → (□p ∨ □q)` in a bounded model.
3. **Open alternatives** — satisfy `◇p ∧ ◇¬p` using exactly two explicit edges.

## Global Model Building

Model-global objectives keep the displayed valuation fixed and check the
formula at every world.

1. **Persistence of truth** — make `p → □p` globally true while retaining at
   least one explicit edge.
2. **Universal possibility** — make `◇p` true at every world in a three-world
   model.
3. **No dead ends** — satisfy both global `□p → ◇p` and seriality.

## Countervaluations

The accessibility relation is fixed and violates a characteristic property.
The player edits only the valuation to expose the corresponding modal axiom.

1. **Refute T** — refute `□p → p` on a non-reflexive frame.
2. **Refute B** — refute `p → □◇p` on a non-symmetric frame.
3. **Refute 4** — refute `□p → □□p` on a non-transitive frame.

These missions represent the countervaluation direction used in correspondence
arguments: a relational failure is converted into a modal counterexample.

## Frame Engineering

Frame objectives quantify over every valuation. The displayed atom assignment
does not determine success.

1. **Reflexive foundation** — establish axiom T on a reflexive frame.
2. **Serial foundation** — establish axiom D on a serial frame.
3. **Build an S4 frame** — combine reflexivity and transitivity under an edge
   bound.

## Correspondence Lab

Each mission separately verifies formula validity, the relational property,
and their agreement on the current finite frame.

1. **T and reflexivity** — `□p → p`.
2. **D and seriality** — `□p → ◇p`.
3. **B and symmetry** — `p → □◇p`.
4. **4 and transitivity** — `□p → □□p`.
5. **5 and Euclideanness** — `◇p → □◇p`.

Agreement on a finite frame is an instance verification, not a proof of the
general characteristic-class theorem.

## Constraint vocabulary

Levels may restrict the number of worlds or explicit edges, require or forbid
specific edges, constrain atoms at named worlds, require or exclude frame
properties, lock editor sections, or require a particular Validate/Enforce
configuration. The in-game **Guide → Objectives & constraints** tab contains a
compact reference.

Solutions are intentionally kept out of this document. See
[SOLUTIONS.md](SOLUTIONS.md) only when a spoiler is wanted.
