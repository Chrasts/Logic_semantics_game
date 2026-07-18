# Campaign Solutions

> **Spoiler warning:** This document gives direct constructions for every
> campaign mission. Complete the campaigns first if you want to discover the
> models independently.

Notation: `wi → wj` denotes an explicit accessibility edge, and `ν(p)` lists
the worlds where `p` is true. Edges not listed can be removed unless the level
states otherwise.

## Local Models & Countermodels

1. **Necessary, not actual:** use `w0 → w1` and `w1 → w1`.
2. **Split the alternatives:** use `w0 → w1` and `w0 → w2`.
3. **Open alternatives:** use `w0 → w1` and `w0 → w2`.
4. **Uniform branching:** use `w0 → w1` and `w0 → w2`.

## Global Model Building

1. **Persistence of truth:** replace the initial edge with `w1 → w0`.
2. **Universal possibility:** use `w0 → w0`, `w1 → w0`, and `w2 → w0`.
3. **No dead ends:** use `w0 → w1` and `w1 → w0`.
4. **Return to truth:** use `w0 → w1`, `w1 → w0`, and `w2 → w0`.

## Countervaluations

1. **Refute T:** set `ν(p) = ∅`.
2. **Refute B:** set `ν(p) = {w0}`.
3. **Refute 4:** set `ν(p) = {w1}`.
4. **Refute 5:** set `ν(p) = {w1}`.

## Frame Engineering

1. **Reflexive foundation:** add `w0 → w0` and `w1 → w1`.
2. **Serial foundation:** use `w0 → w1` and `w1 → w0`.
3. **Build an S4 frame:** retain the path, add `w0 → w2`, and add all three
   reflexive loops.
4. **Build an S5 cluster:** complete the relation to all nine ordered pairs on
   the three worlds.

## Correspondence Lab

1. **T and reflexivity:** add both reflexive loops.
2. **D and seriality:** use the two-edge cycle `w0 → w1 → w0`.
3. **B and symmetry:** add `w1 → w0`.
4. **4 and transitivity:** add `w0 → w2`.
5. **5 and Euclideanness:** retain the fork from `w0`; add `w1 → w1`,
   `w1 → w2`, `w2 → w1`, and `w2 → w2`.
6. **5 on a larger cluster:** retain the three edges from `w0`, then add every
   ordered pair among `w1`, `w2`, and `w3`.
7. **Break reflexivity:** retain only `w0 → w0`.
8. **Break symmetry:** retain only `w0 → w1`.
9. **Break transitivity:** retain `w0 → w1` and `w1 → w2`, removing
   `w0 → w2`.
10. **Break Euclideanness:** retain only `w0 → w1` and `w0 → w2`.

Alternative solutions may exist whenever the level constraints do not enforce
minimality or a unique construction.
