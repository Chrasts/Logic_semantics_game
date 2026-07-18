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
- Work with reflexive, symmetric, transitive, Euclidean, serial, irreflexive,
  and acyclic relations.
- Validate relational properties or enforce supported relational closures.
- Compare modal axioms T, D, B, 4, and 5 with their characteristic frame
  properties on concrete finite frames.
- Inspect counterexample worlds and countervaluations when an objective fails.

The formula editor accepts `¬`, `∧`, `∨`, `→`, `□`, and `◇`, as well as the text
alternatives `!`, `&`, `|`, `->`, `box`, and `diamond`.

## Ways to play

### Sandbox

Build and inspect models freely. Choose whether a formula should hold at one
world, globally under the displayed valuation, or on the underlying frame under
all valuations.

### Tutorial

Eight short interactive lessons introduce the game interface, valuations,
accessibility, semantic scopes, frame constraints, and correspondence.

### Campaigns

Five campaigns contain 17 missions organized by objective type:

- Local Models & Countermodels
- Global Model Building
- Countervaluations
- Frame Engineering
- Correspondence Lab

Missions can restrict worlds, relations, valuations, editable inputs, and frame
properties. The game provides no solution hints before a mission is completed.

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

Frame validity is computed exhaustively for the finite model currently shown.
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
- [Development guide](docs/DEVELOPMENT.md) — architecture, tests, and technical scope

## Technology

The application is built with React, TypeScript, Vite, and React Flow. The modal
logic engine is independent of the UI and is covered together with the primary
user interactions by an automated Vitest test suite.
