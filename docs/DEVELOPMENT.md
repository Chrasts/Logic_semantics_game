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
│   ├── evaluate.ts      # local semantics and explanations
│   ├── validity.ts      # model-global and finite-frame validity
│   ├── frame.ts         # frame closure and property validation
│   ├── objective.ts     # semantic game objectives and verdicts
│   └── constraints.ts   # reusable level construction constraints
├── campaign.ts          # data-driven tutorial and campaign missions
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
worlds and atoms. A safety limit prevents impractically large checks.

## Frame rules

A frame rule can be off, validated without changing the relation, or enforced
by adding derived edges. Reflexivity, symmetry, transitivity, and Euclideanness
support enforcement. Seriality, irreflexivity, and acyclicity are validation-only
because repairing them can require arbitrary choices or deleting explicit data.

## Persistence

Sandbox state and mission progress are stored in browser `localStorage`. There
is currently no backend, account system, or cross-device synchronization.

## Current technical scope

The project works with explicit finite frames. It does not currently include an
external solver, proof of model minimality, a level editor, or a formal notation
for regular infinite frames. These are possible extensions rather than hidden
requirements of the existing engine.
