# Dependency waves

Waves are a sequencing aid, not a rigid schedule. Work inside a wave can be parallelized when its dependencies are satisfied.

```text
Wave 0: Project baseline
    ↓
Wave 1: Architecture decisions
    ↓
Wave 2: Local application foundation
    ↓
Wave 3: Quality and first vertical slice
    ↓
Wave 4: Product website and release preparation
```

## Wave 0 — Project baseline

Tasks: `MARGIN-001`

Establish the product context, repository conventions, issue templates, Wiki-ready pages, labels, and Project configuration.

## Wave 1 — Architecture decisions

Tasks: `MARGIN-002`, `MARGIN-003`

Select the local application runtime and persistence direction, then define the first domain model and balance rules.

`MARGIN-003` depends on the runtime decision only where the chosen persistence or type system affects the model. The domain rules should remain framework-independent.

## Wave 2 — Local application foundation

Tasks: `MARGIN-004`, `MARGIN-005`, `MARGIN-006`

Create the reproducible local environment, initial application shell, visual tokens, persistence boundary, and safe local-data handling.

`MARGIN-004` is the prerequisite for the other Wave 2 tasks. `MARGIN-005` and `MARGIN-006` can then proceed in parallel.

## Wave 3 — Quality and first vertical slice

Tasks: `MARGIN-007`, `MARGIN-008`

Add automated checks and prove the architecture with the first end-to-end flow: add salary, record an expense, and display remaining disposable money.

`MARGIN-008` depends on the domain model, persistence boundary, and application shell. `MARGIN-007` can begin as soon as the local setup exists.

## Wave 4 — Product website and release preparation

Tasks: `MARGIN-009`

Create the static product/demo website structure and connect the eventual `site/` build to GitHub Pages. This can begin with placeholders, but final screenshots depend on a usable local vertical slice.
