# Development Guide

This document contains implementation and contributor information for Logic
Model Builder. The main README is intentionally focused on the playable game.

## Commands

```bash
npm install
npm run dev        # local development server
npm test           # run the test suite once
npm run test:watch # rerun tests while files change
npm run build      # type-check and create a production build
```

On Windows systems where PowerShell blocks `npm.ps1`, invoke the same scripts
through `npm.cmd`, for example `npm.cmd test`.

## Architecture

```text
src/
├── logic/
│   ├── formula.ts       # typed modal-formula AST
│   ├── parser.ts        # tokenizer and precedence parser
│   ├── model.ts         # finite Kripke models
│   ├── evaluate.ts      # local semantics and recursive evaluation traces
│   ├── validity.ts      # model-global and finite-frame validity
│   ├── frame.ts         # frame closure and property validation
│   ├── objective.ts     # semantic game objectives and verdicts
│   └── constraints.ts   # reusable level construction constraints
├── campaign.ts          # data-driven tutorial and campaign missions
├── level-format.ts      # versioned validation for shared custom missions
├── test/                # shared UI test setup
├── App.tsx              # application shell and model editor
└── main.tsx             # React entry point
```

The logic modules do not depend on React or React Flow. Campaign and tutorial
missions are declarative data consumed by the same objective and constraint
engine used by the sandbox.

## Verification scopes

- **Pointed:** evaluates `M,w ⊨ φ` at the designated world.
- **Model-global:** evaluates `M ⊨ φ` at every world under the current valuation.
- **Frame validity:** evaluates `F ⊨ φ` at every world under every valuation.
- **Correspondence:** compares finite-frame validity with a selected relational
  property on the current frame and reports both sides separately.

Finite-frame validity enumerates valuations and is exponential in the number of
worlds and atoms. Interactive checks are capped at 65,536 valuations to prevent
impractically long work on the browser's main thread.

## Frame rules

A frame rule can be off, validated without changing the relation, or enforced
by adding derived edges. Reflexivity, symmetry, transitivity, and Euclideanness
support enforcement. Seriality, irreflexivity, and acyclicity are validation-only
because repairing them can require arbitrary choices or deleting explicit data.

## Persistence

Sandbox state and mission progress are stored in browser `localStorage`. There
is currently no backend, account system, or cross-device synchronization. The
Data dialog can reset these stores independently and export or import versioned
model JSON. Imports validate formulas, world identifiers, atoms, relations, and
supported frame-rule modes before changing the sandbox.

An anonymous guest profile stores a random local identifier and up to 250 recent
verification attempts. It does not use IP addresses or browser fingerprinting.
Profile backups contain history and learning progress and can be restored in a
different browser through the same Data dialog.

## Verification diagnostics

Objective verdicts include structured truth values for every world under the
relevant valuation. Failed frame-validity checks additionally expose the full
countervaluation separately from the prose explanation. Each relevant local
evaluation also returns a recursive tree containing the active subformula,
world, semantic rule, truth value, child evaluations, and focused diagnostics.
The UI renders this trace as a nested, expandable evaluation tree.

The evaluator deliberately records both Boolean children and every accessible
successor checked by `□` or `◇`, rather than retaining only the first decisive
branch. This makes the trace useful for teaching while preserving the same
truth-functional result.

## Formula-equivalence objectives

An optional `comparisonFormula` changes the configured semantic target from a
single-formula truth check to an equivalence check. Pointed equivalence compares
both truth values at the evaluation world. Model-global equivalence compares
them at every world under the displayed valuation. Frame equivalence checks the
biconditional at every world under every valuation and returns a distinguishing
countervaluation when it fails. Correspondence objectives intentionally cannot
be combined with formula equivalence.

## Solution diversity and isomorphism

Successful guided or custom missions receive a canonical finite-structure
signature in the local guest profile. Canonicalization ignores world names and
coordinates. It preserves explicit semantic relation edges and preserves
valuations for pointed/model objectives; frame and correspondence solutions
ignore the displayed valuation. Pointed objectives additionally preserve the
designated evaluation world. The current exact permutation algorithm is capped
at eight worlds, and diversity tracking is skipped—not mission verification—if
that limit is exceeded. At most 25 signatures are retained per mission.

## Optional mission bonuses

A level may define `bonusConstraints` in addition to its required construction
constraints. Bonus conditions do not block completion and are not shown before
the primary objective is verified.

## Prediction interactions

A level may optionally require a prediction before verification. The current
interaction kinds ask for either the formula's truth value or a counterexample
world. Predictions do not alter the modal semantics or replace the objective;
they are compared with the structured verdict after the construction has been
evaluated. This discourages blind trial and error while keeping solution hints
out of the mission briefing.

The `frame-property` interaction presents an author-specified set of relational
properties and compares the player's answer with `expectedProperty`. With
`mustBeCorrect: true`, the semantic objective and the answer must both succeed
before completion. The expected answer remains level metadata, not an inference
silently guessed from a relation that may violate several properties at once.

The `countervaluation` interaction stores two or more complete valuations with
stable choice identifiers. Import validation requires every choice to assign an
atom list to every mission world and requires `expectedChoice` to reference one
of those choices. With `mustBeCorrect`, selecting the correct concrete
assignment is part of completion rather than optional prediction feedback.

The `model-choice` interaction stores two or more self-contained finite pointed
models. Each candidate has its own worlds, atom lists, explicit relation, and
evaluation world. Import validation is independent for every candidate, so a
candidate cannot reference worlds from either the playable level or another
choice. The expected choice is authored explicitly because the prompt may ask
about any supported semantic property, not only the level's primary formula.

## Custom mission files

Custom missions use the versioned `logic-model-builder-level` JSON format. The
authoring workflow captures two independent workspace snapshots: the initial
state delivered to the player and, optionally, a reference solution. Before the
solution is stored, the engine checks the objective, construction constraints,
required frame-rule modes, and active relational rules. Importing a mission
loads only the initial state; the solution is metadata and is never applied to
the player workspace. Because JSON is inspectable, it should not be treated as
secret or tamper-proof answer storage.

`Playtest as player` validates the same serialized package used for download,
then launches its initial snapshot through the normal custom-mission loader.
Leaving the playtest restores the author workspace. `Restore captured start`
is intentionally destructive and therefore asks for confirmation.

The editor also captures the author-facing title, instruction and learning
objective, plus the parts a player may edit. Authors can set world and
edge bounds, required or forbidden frame properties, a prediction interaction,
required or forbidden edges and atom assignments, and an optional maximum-edge
bonus. Edge constraints use `source -> target`; atom constraints use
`world: p q`, with commas, semicolons, or new lines separating entries where
appropriate. Imports validate the formula, semantic
scope, worlds, relation, evaluation world, frame rules, correspondence preset,
constraints, prediction, bonus, and edit permissions before opening the mission.

The editor rejects constraints that require and forbid the same edge, atom, or
frame property before a mission file is exported or launched.

`maximumChanges` is a baseline-relative construction constraint. It counts the
symmetric differences in world identifiers, distinct explicit relation pairs,
and `(world, atom)` memberships. Coordinates are presentation data and never
count as semantic changes. This deliberately describes a semantic edit budget,
not mouse clicks or undo-history entries.

## Current technical scope

The project works with explicit finite frames. It does not currently include an
external solver, proof of model minimality, or a formal notation
for regular infinite frames. These are possible extensions rather than hidden
requirements of the existing engine.
