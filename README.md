# Logic Model-Building Game

An interactive educational web application for constructing finite Kripke
models, evaluating modal formulas, and exploring correspondence between modal
axioms and relational frame properties.

## Run locally

Node.js 20 LTS or newer is required.

```bash
npm install
npm run dev
```

Vite prints the local application URL. On Windows PowerShell installations that
block `npm.ps1`, use `npm.cmd` instead of `npm`.

```bash
npm test           # run all core and UI tests once
npm run test:watch # rerun tests while files change
npm run build      # type-check and build the production application
```

## Deploy to GitHub Pages

Build the application and publish the contents of `dist/` from a dedicated
`gh-pages` branch. In the repository settings, select **Deploy from a branch**
and use `gh-pages` with the root (`/`) folder as the Pages source.

## Current features

- Visual construction of finite Kripke frames with React Flow.
- Editable worlds, valuations, accessibility edges, and evaluation world.
- Modal formula parser supporting `¬`, `∧`, `∨`, `→`, `□`, and `◇`.
- Text alternatives: `!`, `&`, `|`, `->`, `box`, and `diamond`.
- Deterministic evaluation with human-readable explanations.
- Verification at one selected world.
- Verification at every world under the current valuation.
- Finite-frame validity across every valuation of the atoms in a formula.
- Explicit pointed-model, model-global, frame-validity, and correspondence objectives.
- Separate formula, relational-property, and instance-correspondence verdicts.
- Counterexample worlds and countervaluations when verification fails.
- Reflexive, symmetric, transitive, and Euclidean closure.
- Validation of reflexive, symmetric, transitive, Euclidean, serial,
  irreflexive, and acyclic frames.
- Correspondence presets for modal axioms T, D, B, 4, and 5.
- Edit and Evaluate modes, undo/redo, collapsible panels, and local persistence.
- Core logic and UI regression tests with Vitest and Testing Library.
- A concise modal-logic tutorial and three data-driven campaign tracks.
- A separate formal introduction to Kripke semantics using the valuation ν.
- A tabbed in-game guide for modal theory, controls, objectives, and constraints.
- Reusable construction constraints for size, edges, valuations, and frame properties.

## Mathematical conventions

A finite Kripke model is `M = (W, R, ν)`, where `W` is a finite set of worlds,
`R` is a binary accessibility relation, and `ν: Prop → ℘(W)` is a valuation.

The underlying frame is `F = (W, R)`. The application uses the standard
satisfaction notation `M,w ⊨ φ`; `⊩` is also used in some literature, especially
for forcing, but is not used as a component of the model here.

- `M,w ⊨ p` exactly when `w ∈ ν(p)`.
- Boolean connectives use standard classical semantics.
- `M,w ⊨ □φ` exactly when `φ` holds at every world accessible from `w`.
- `M,w ⊨ ◇φ` exactly when `φ` holds at some world accessible from `w`.
- `□φ` is vacuously true and `◇φ` is false at a world with no successors.

The parser uses precedence `¬/□/◇` > `∧` > `∨` > `→`. Implication is
right-associative, and parentheses override precedence.

The application distinguishes three semantic scopes:

- `M,w ⊨ φ`: one selected world under the current valuation;
- `M ⊨ φ`: every world under the current valuation;
- `F ⊨ φ`: every world under every valuation on a finite frame.

The correspondence objective compares `F ⊨ φ` with a selected relational
property on the current finite frame. Agreement is an instance verification,
not by itself a general proof that the formula characterizes that property on
every frame.

Finite-frame validity is checked by exhaustive valuation enumeration. Its cost
is exponential in the number of worlds and distinct atoms, so the UI enforces a
safety limit and reports when a request is too large.

## Frame rules

Explicit edges are the relation entered by the user. A frame rule can be:

- **Off** — ignored;
- **Validate** — checked without modifying the relation;
- **Enforce** — completed with the least closure and displayed as derived,
  dashed edges.

Reflexivity, symmetry, transitivity, and Euclideanness support enforcement.
Seriality, irreflexivity, and acyclicity are validation-only because automatic
repair would require arbitrary choices or deletion of explicit user data.

## Project structure

```text
src/
├── logic/
│   ├── formula.ts       # typed modal-formula AST
│   ├── parser.ts        # tokenizer and precedence parser
│   ├── model.ts         # finite Kripke models
│   ├── evaluate.ts      # deterministic local semantics and explanations
│   ├── validity.ts      # model-wide and finite-frame validity
│   └── frame.ts         # frame closure and property validation
├── test/                # shared UI test setup
├── App.tsx              # interactive sandbox
└── main.tsx             # React entry point
```

The logic core has no dependency on React or React Flow.

## Campaign documentation

- [Campaign Guide](docs/CAMPAIGNS.md) — campaign and mission descriptions
  without solutions.
- [Campaign Solutions](docs/SOLUTIONS.md) — explicitly separated spoilers and
  reference constructions.

## Current scope

The pilot intentionally has no backend, database, AI validator, external
solver, or proof of model minimality. Infinite Kripke models are deferred until
a precise regular representation and semantics are specified.

Tutorial and campaign content use the same verified sandbox and correspondence
engine. Future chapters can add bounded frame search, scoring, and further
constraint types without replacing the editor.
