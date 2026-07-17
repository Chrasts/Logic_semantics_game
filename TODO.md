# Project roadmap

This is a living overview, not a fixed specification. Items are grouped by
priority so that optional ideas do not complicate the first usable pilot.

## Next: verify and stabilize the sandbox

- [x] Add an initial UI regression suite for world creation, undo, mode locking, frame properties, and parser errors.
- [x] Add selected-world, model-wide, and finite-frame validity scopes.
- [x] Add Validate/Enforce frame rules and Euclidean, serial, irreflexive, and acyclic checks.
- [x] Add initial T, D, B, 4, and 5 correspondence presets.
- [ ] Manually verify representative formulas and countermodels.
- [ ] Expand tests for combinations of reflexive, symmetric, and transitive frames.
- [ ] Add interaction tests for creating, moving, selecting, and deleting worlds and edges.
- [ ] Improve validation messages for incomplete worlds, edges, and valuations.
- [ ] Highlight the witness world or counterexample edge named by an explanation.
- [ ] Add JSON export and import for sandbox models.
- [ ] Review keyboard controls, focus order, contrast, and screen-reader labels.
- [ ] Test and refine the mobile and narrow-screen layout.

## Campaign MVP

- [ ] Define a typed level format: formula, truth goal, frame constraints, hint, and explanation.
- [ ] Create a small introductory sequence covering atoms, `□`, `◇`, terminal worlds, and branching.
- [ ] Add known countermodel challenges after the introductory levels.
- [ ] Validate any correct player model instead of comparing it with a stored solution.
- [ ] Add level unlocking and local progress storage.
- [ ] Add a simple motivational score based on explicit worlds and edges.
- [ ] Keep minimality optional; do not claim that a score proves an optimal model.
- [ ] Decide the tone and depth of hints and post-level explanations.

## Product completion

- [ ] Add onboarding that introduces worlds, valuations, accessibility, and the evaluation world.
- [ ] Add an accessible symbol/formula input experience on touch devices.
- [ ] Add recovery for malformed or incompatible locally stored drafts.
- [ ] Add error boundaries and a friendly fallback screen.
- [ ] Review bundle size and loading behavior.
- [ ] Add continuous integration for tests and production builds.
- [ ] Deploy a preview and then a public pilot.

## Decisions to make

- [ ] Campaign audience: university logic students, self-learners, or a broader puzzle audience.
- [ ] Level terminology and how much mathematical notation to expose initially.
- [ ] Whether derived frame edges should count toward campaign scores.
- [ ] Whether campaign levels may lock frame properties or let players choose them.
- [ ] How detailed explanations should be: one decisive reason or a full evaluation tree.
- [ ] Whether sandbox and campaign should share one editor layout or use different levels of complexity.
- [ ] Hosting target and public repository presentation.

## Reasonable optional features

- [ ] Truth table of every subformula at every world.
- [ ] Step-by-step evaluation mode.
- [x] Undo and redo for graph edits.
- [ ] Shareable model links or files.
- [ ] Model presets and example formulas.
- [x] Serial and Euclidean frame validation.
- [ ] Separate campaigns for K, T, S4, S5, and related systems.
- [ ] Automatic layout for larger graphs.

## Deferred research directions

- [ ] Define a precise regular or lasso representation for infinite Kripke models.
- [ ] Determine how infinite structures interact with editing, explanations, and scoring.
- [ ] Epistemic models with multiple accessibility relations.
- [ ] Common knowledge and public announcement logic.
- [ ] Finite first-order and algebraic model builders.
- [ ] Tableau, proof construction, and representation-translation modes.
- [ ] Automatic model search or procedural level generation.

## Explicitly out of scope for the current pilot

- Backend and database.
- OpenAI API as a mathematical validator.
- External theorem provers, SAT/SMT solvers, and proof assistants.
- Proof of model minimality.
- Simultaneous implementation of non-modal game modes.
