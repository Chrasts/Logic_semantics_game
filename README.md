# Logic Model Builder

Logic Model Builder is an interactive game for constructing finite Kripke
models and frames, testing modal formulas, and exploring the connection between
modal axioms and relational properties.

## [Play online](https://chrasts.github.io/Logic_semantics_game/)

The browser version is the primary way to play. It requires no installation,
and sandbox models and completed missions are saved locally in the browser.

## What you can do

- Build finite Kripke models visually by adding and moving worlds.
- Assign propositional atoms and draw accessibility relations.
- Evaluate formulas at a selected world or throughout a model.
- Check validity on a finite frame across every possible valuation.
- Compare two formulas at one world, throughout the displayed model, or under
  every valuation on a finite frame, with a distinguishing world and valuation
  when they are not equivalent.
- Work with reflexive, symmetric, transitive, Euclidean, serial, irreflexive,
  and acyclic relations.
- Validate relational properties or enforce supported relational closures.
- Compare modal axioms T, D, B, 4, and 5 with their characteristic frame
  properties on concrete finite frames.
- Inspect counterexample worlds and countervaluations when an objective fails.
- Expand a recursive evaluation tree showing subformulas, worlds, modal
  witnesses, counterexample successors, and vacuous truth.
- Keep an anonymous browser-local guest history and export it as a JSON backup.
- Record structurally distinct successful solutions per mission up to finite
  Kripke-model isomorphism, so renaming worlds does not inflate the count.
- Turn the current sandbox into a versioned custom mission, choose which editor
  parts remain unlocked, add size and frame-property constraints, predictions,
  required or forbidden edges and atoms, and an optional edge bonus, then share
  or launch the mission as JSON. Authors can capture a separate starting state
  and a mathematically verified reference solution; importing the mission loads
  only the player start. The author can restore that start or playtest the
  mission immediately in the same locked player workspace used by imports.
- Define repair missions with a maximum semantic-change budget measured against
  the initial model (worlds, explicit edges, and atom memberships).

The formula editor accepts `¬`, `∧`, `∨`, `→`, `□`, and `◇`, as well as the text
alternatives `!`, `&`, `|`, `->`, `box`, and `diamond`.

## Ways to play

### Sandbox

Build and inspect models freely. Choose whether a formula should hold at one
world, globally under the displayed valuation, or on the underlying frame under
all valuations.

### Tutorial

Thirteen interactive lessons with explicit learning objectives introduce
valuations, evaluation worlds, model editing, accessibility, nested modalities,
countermodels, semantic scopes, frame constraints, correspondence, and a final
model-building recap. Selected lessons require a prediction before verification.

### Campaigns

Six campaigns contain 33 missions organized by objective type:

- Local Models & Countermodels
- Global Model Building
- Countervaluations
- Frame Engineering
- Correspondence Lab
- Formula Equivalence Lab

Missions can restrict worlds, relations, valuations, editable inputs, and frame
properties. Some include optional bonus constraints revealed only after the
primary objective is completed. The game provides no solution hints beforehand.
Selected missions also require the player to identify a relational property;
an incorrect required answer prevents completion even when the accompanying
semantic check succeeds.
Countervaluation-choice missions present complete atom assignments per world
and require the player to select the assignment that distinguishes or refutes
the configured formula.
Candidate-model missions present several small pointed Kripke models side by
side, including their valuations and explicit relations, and require a semantic
choice rather than an edit to the active workspace.

### Guide

The in-game guide provides a compact introduction to Kripke semantics, controls,
objective scopes, and construction constraints.

## Modal semantics

A finite Kripke frame is `F = ⟨W,R⟩`. A model is `M = ⟨W,R,ν⟩`, where
`ν: Prop → ℘(W)` is a valuation. The game uses the standard satisfaction
notation `M,w ⊨ φ`.

- `M,w ⊨ □φ` iff every `v` with `wRv` satisfies `φ`.
- `M,w ⊨ ◇φ` iff some `v` with `wRv` satisfies `φ`.
- `M ⊨ φ` checks every world under the current valuation.
- `F ⊨ φ` checks every world under every valuation.

Frame validity is computed exhaustively for the finite frame currently shown.
A correspondence result verifies agreement on that particular frame; it is not
by itself a general mathematical proof of a characteristic-class theorem.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Vite will print the local address. If Windows PowerShell blocks `npm.ps1`, use
`npm.cmd run dev` instead.

## Documentation

- [Campaign guide](docs/CAMPAIGNS.md) — mission descriptions without solutions
- [Campaign solutions](docs/SOLUTIONS.md) — spoilers and reference constructions
- [Mathematical conventions](docs/MATHEMATICAL_NOTES.md) — semantics, notation, correspondences, and scope
- [Development guide](docs/DEVELOPMENT.md) — architecture, tests, and technical scope

## Technology

The application is built with React, TypeScript, Vite, and React Flow. The modal
logic engine is independent of the UI and is covered together with the primary
user interactions by an automated Vitest test suite.

## Author

Created and maintained by [Chrasts](https://github.com/Chrasts).

Copyright © 2026 Chrasts. No open-source license is currently included.
