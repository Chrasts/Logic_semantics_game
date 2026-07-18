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
4. **Uniform branching** — combine two existential witnesses with a universal
   condition on every accessible world.

## Global Model Building

Model-global objectives keep the displayed valuation fixed and check the
formula at every world.

1. **Persistence of truth** — make `p → □p` globally true while retaining at
   least one explicit edge.
2. **Universal possibility** — make `◇p` true at every world in a three-world
   model.
3. **No dead ends** — satisfy both global `□p → ◇p` and seriality.
4. **Return to truth** — coordinate nested possibility with seriality across a
   three-world model.

## Countervaluations

The accessibility relation is fixed and violates a characteristic property.
The player edits only the valuation to expose the corresponding modal axiom.

1. **Refute T** — refute `□p → p` on a non-reflexive frame.
2. **Refute B** — refute `p → □◇p` on a non-symmetric frame.
3. **Refute 4** — refute `□p → □□p` on a non-transitive frame.
4. **Refute 5** — construct a countervaluation on a non-Euclidean fork.

These missions illustrate the countervaluation direction used in correspondence
arguments: a relational failure is converted into a modal counterexample.

## Frame Engineering

Frame objectives quantify over every valuation. The displayed atom assignment
does not determine success.

1. **Reflexive foundation** — establish axiom T on a reflexive frame.
2. **Serial foundation** — establish axiom D on a serial frame.
3. **Build an S4 frame** — combine reflexivity and transitivity under an edge
   bound.
4. **Build an S5 cluster** — complete a connected reflexive, symmetric, and
   transitive frame.

## Correspondence Lab

Each mission separately verifies formula validity, the relational property,
and their agreement on the current finite frame.

1. **T and reflexivity** — `□p → p`.
2. **D and seriality** — `□p → ◇p`.
3. **B and symmetry** — `p → □◇p`.
4. **4 and transitivity** — `□p → □□p`.
5. **5 and Euclideanness** — `◇p → □◇p`.
6. **5 on a larger cluster** — complete Euclidean closure for three accessible
   alternatives.
7. **Break reflexivity** — remove a reflexive loop and observe both T validity
   and reflexivity fail.
8. **Break symmetry** — turn a two-way relation into a one-way edge and expose
   the failure of B.
9. **Break transitivity** — retain a two-step path while removing its shortcut.
10. **Break Euclideanness** — reduce a Euclidean cluster to a non-Euclidean
    fork and expose the failure of axiom 5.

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

Some missions include optional bonus constraints. They are deliberately hidden
until after the primary objective has been verified.
