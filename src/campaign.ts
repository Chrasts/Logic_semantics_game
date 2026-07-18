import type { ConstructionConstraints, FramePropertyName, ObjectiveScope } from './logic'

export type LevelEditPermission = 'worlds' | 'valuations' | 'edges' | 'constraints' | 'evaluation'

export interface GameLevel {
  readonly id: string
  readonly chapter: string
  readonly title: string
  readonly concept: string
  readonly briefing?: string
  readonly instruction: string
  readonly formula: string
  readonly scope: ObjectiveScope
  readonly targetTruth: boolean
  readonly evaluationWorld: string
  readonly correspondencePreset?: 't' | 'd' | 'b' | '4' | '5'
  readonly worlds: readonly {
    readonly id: string
    readonly atoms: string
    readonly position: { readonly x: number; readonly y: number }
  }[]
  readonly edges: readonly { readonly from: string; readonly to: string }[]
  readonly frameRules?: Partial<Record<FramePropertyName, 'off' | 'validate' | 'enforce'>>
  readonly requiredFrameRules?: Partial<Record<FramePropertyName, 'validate' | 'enforce'>>
  readonly constraints?: ConstructionConstraints
  /** Optional challenge evaluated only after the primary objective succeeds. */
  readonly bonusConstraints?: ConstructionConstraints
  readonly editable: readonly LevelEditPermission[]
}

export interface CampaignTrack {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly levels: readonly GameLevel[]
}

export const tutorialLevels: readonly GameLevel[] = [
  {
    id: 'tutorial-evaluation', chapter: 'Tutorial', title: 'Evaluation world', concept: '“True somewhere” means true at the selected world',
    briefing: 'The petrol outline marks the evaluation world used by a pointed objective. Select a world on the map, or use the Evaluation world control in the Verification panel.',
    instruction: 'Make p true at the evaluation world.', formula: 'p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [], editable: ['evaluation'],
  },
  {
    id: 'tutorial-add-world', chapter: 'Tutorial', title: 'Adding a world', concept: 'World controls',
    briefing: 'Use + World above the map or + Add world in the Worlds and valuations panel. New worlds receive a unique default name and can be repositioned on the map.',
    instruction: 'Create a model with exactly three worlds.', formula: 'p ∨ ¬p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3 }, editable: ['worlds'],
  },
  {
    id: 'tutorial-valuation', chapter: 'Tutorial', title: 'Editing a valuation', concept: 'True atoms and ν',
    briefing: 'Edit the True atoms field in the Worlds and valuations panel or select a world on the map and use its inspector. Separate several atoms with spaces or commas.',
    instruction: 'Make p true at w0.', formula: 'p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2 }, editable: ['valuations'],
  },
  {
    id: 'tutorial-add-relation', chapter: 'Tutorial', title: 'Accessibility', concept: 'R ⊆ W × W · M,w ⊨ ◇φ',
    briefing: 'A relation is a directed arrow between worlds. Create one by dragging between handles on the map or by using the Accessibility panel.',
    instruction: 'Make ◇p true at w0.', formula: '◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, minimumEdges: 1, maximumEdges: 1 }, editable: ['edges'],
  },
  {
    id: 'tutorial-remove-relation', chapter: 'Tutorial', title: 'Editing accessibility', concept: 'M,w ⊨ □φ',
    briefing: 'Select an explicit relation on the map and use Delete selected edge, double-click it, or remove it from the Accessibility panel.',
    instruction: 'Use exactly one relation and make □p true at w0.', formula: '□p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [{ from: 'w0', to: 'w0' }, { from: 'w0', to: 'w1' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, minimumEdges: 1, maximumEdges: 1 }, editable: ['edges'],
  },
  {
    id: 'tutorial-global-model', chapter: 'Tutorial', title: 'Global truth in a model', concept: 'M ⊨ φ iff ∀w ∈ W: M,w ⊨ φ',
    briefing: 'In the game, “true globally in the model” checks every world while keeping the displayed valuation fixed. A single counterexample world makes the objective fail.',
    instruction: 'Make p ∨ ◇p true globally in M.', formula: 'p ∨ ◇p', scope: 'model', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 1 }, editable: ['edges'],
  },
  {
    id: 'tutorial-frame-constraint', chapter: 'Tutorial', title: 'Frames and global constraints', concept: 'F ⊨ φ iff ∀ν ∀w ∈ W: ⟨F,ν⟩,w ⊨ φ',
    briefing: '“Valid on the frame” checks every world under every possible valuation, not only the atoms currently displayed. Constraints can validate a relational property or enforce its closure globally.',
    instruction: 'Globally enforce reflexivity and verify □p → p on the resulting frame.', formula: '□p → p', scope: 'frame', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [], requiredFrameRules: { reflexive: 'enforce' }, constraints: { minimumWorlds: 2, maximumWorlds: 2 }, editable: ['constraints'],
  },
  {
    id: 'tutorial-correspondence', chapter: 'Tutorial', title: 'Formula and relation', concept: 'F ⊨ p → □◇p iff R is symmetric',
    briefing: 'A correspondence claim compares modal frame validity with a property of R. Verification reports F ⊨ φ, the relational condition, and their agreement on the current finite frame separately.',
    instruction: 'Satisfy the frame constraint and verify that both sides agree on this finite frame.', formula: 'p → □◇p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: 'b',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [{ from: 'w0', to: 'w1' }], frameRules: { symmetric: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2 }, editable: ['edges'],
  },
  {
    id: 'tutorial-recap', chapter: 'Tutorial', title: 'Model-building recap', concept: 'Worlds, valuations, relations, and pointed truth together',
    briefing: 'This recap combines the editor operations from the preceding lessons. Build the required three-world model, set its valuation, and choose exactly two accessibility edges.',
    instruction: 'Make ◇p ∧ □(p ∨ q) true at w0 using exactly three worlds and two relations.', formula: '◇p ∧ □(p ∨ q)', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 70 } }, { id: 'w1', atoms: '', position: { x: 90, y: 230 } }],
    edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 2, maximumEdges: 2 }, editable: ['worlds', 'valuations', 'edges', 'evaluation'],
  },
]

export const campaignTracks: readonly CampaignTrack[] = [
  {
    id: 'local', title: 'Local Models & Countermodels',
    description: 'Satisfy or refute formulas at a designated world under structural restrictions.',
    levels: [
      {
        id: 'local-necessary-not-actual', chapter: 'Local Models', title: 'Necessary, not actual', concept: 'Pointed satisfiability under seriality',
        instruction: 'Make □p ∧ ¬p true at w0.', formula: '□p ∧ ¬p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
        edges: [], frameRules: { serial: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 3 }, editable: ['edges'],
      },
      {
        id: 'local-distribution-countermodel', chapter: 'Local Models', title: 'Split the alternatives', concept: 'Countermodel construction',
        instruction: 'Make □(p ∨ q) → (□p ∨ □q) false at w0.', formula: '□(p ∨ q) → (□p ∨ □q)', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 70 } }, { id: 'w1', atoms: 'p', position: { x: 90, y: 230 } }, { id: 'w2', atoms: 'q', position: { x: 400, y: 230 } }],
        edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3, maximumEdges: 3 }, editable: ['edges'],
      },
      {
        id: 'local-contingent-possibility', chapter: 'Local Models', title: 'Open alternatives', concept: 'Two existential witnesses',
        instruction: 'Make ◇p ∧ ◇¬p true at w0.', formula: '◇p ∧ ◇¬p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 70 } }, { id: 'w1', atoms: 'p', position: { x: 90, y: 230 } }, { id: 'w2', atoms: '', position: { x: 400, y: 230 } }],
        edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 2, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'local-uniform-branching', chapter: 'Local Models', title: 'Uniform branching', concept: 'Existential witnesses under a universal condition',
        instruction: 'Make ◇(p ∧ q) ∧ ◇(p ∧ ¬q) ∧ □p true at w0.', formula: '◇(p ∧ q) ∧ ◇(p ∧ ¬q) ∧ □p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 60 } }, { id: 'w1', atoms: 'p q', position: { x: 90, y: 230 } }, { id: 'w2', atoms: 'p', position: { x: 400, y: 230 } }],
        edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 2, maximumEdges: 3 }, bonusConstraints: { maximumEdges: 2 }, editable: ['edges'],
      },
    ],
  },
  {
    id: 'global', title: 'Global Model Building',
    description: 'Construct relations that make formulas hold throughout a model under a fixed valuation.',
    levels: [
      {
        id: 'global-persistence', chapter: 'Global Models', title: 'Persistence of truth', concept: 'Global implication',
        instruction: 'Make p → □p true at every world.', formula: 'p → □p', scope: 'model', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: 'p', position: { x: 100, y: 130 } }, { id: 'w1', atoms: '', position: { x: 390, y: 130 } }],
        edges: [{ from: 'w0', to: 'w1' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, minimumEdges: 1, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'global-possibility', chapter: 'Global Models', title: 'Universal possibility', concept: 'Global modal truth',
        instruction: 'Make ◇p true at every world.', formula: '◇p', scope: 'model', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: 'p', position: { x: 245, y: 70 } }, { id: 'w1', atoms: '', position: { x: 90, y: 230 } }, { id: 'w2', atoms: '', position: { x: 400, y: 230 } }],
        edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3, maximumEdges: 4 }, editable: ['edges'],
      },
      {
        id: 'global-no-dead-ends', chapter: 'Global Models', title: 'No dead ends', concept: 'Global truth under seriality',
        instruction: 'Make □p → ◇p true at every world and satisfy the frame constraint.', formula: '□p → ◇p', scope: 'model', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
        edges: [], frameRules: { serial: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'global-return-to-truth', chapter: 'Global Models', title: 'Return to truth', concept: 'Nested possibility under seriality',
        instruction: 'Make p → □◇p true globally and satisfy seriality.', formula: 'p → □◇p', scope: 'model', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: 'p', position: { x: 245, y: 60 } }, { id: 'w1', atoms: '', position: { x: 90, y: 230 } }, { id: 'w2', atoms: '', position: { x: 400, y: 230 } }],
        edges: [], frameRules: { serial: 'validate' }, constraints: { minimumWorlds: 3, maximumWorlds: 3, maximumEdges: 4 }, bonusConstraints: { maximumEdges: 3 }, editable: ['edges'],
      },
    ],
  },
  {
    id: 'countervaluations', title: 'Countervaluations',
    description: 'Keep a defective frame fixed and expose the corresponding modal axiom with a valuation.',
    levels: [
      {
        id: 'witness-t', chapter: 'Countervaluations', title: 'Refute T', concept: 'Failure of reflexivity',
        instruction: 'Make □p → p false at w0.', formula: '□p → p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: 'p', position: { x: 245, y: 130 } }], edges: [], constraints: { minimumWorlds: 1, maximumWorlds: 1, maximumEdges: 0, forbiddenAtoms: { w0: ['q'] } }, editable: ['valuations'],
      },
      {
        id: 'witness-b', chapter: 'Countervaluations', title: 'Refute B', concept: 'Failure of symmetry',
        instruction: 'Make p → □◇p false at w0.', formula: 'p → □◇p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
        edges: [{ from: 'w0', to: 'w1' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, requiredEdges: [{ from: 'w0', to: 'w1' }], forbiddenEdges: [{ from: 'w1', to: 'w0' }] }, editable: ['valuations'],
      },
      {
        id: 'witness-four', chapter: 'Countervaluations', title: 'Refute 4', concept: 'Failure of transitivity',
        instruction: 'Make □p → □□p false at w0.', formula: '□p → □□p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 70, y: 130 } }, { id: 'w1', atoms: '', position: { x: 260, y: 130 } }, { id: 'w2', atoms: '', position: { x: 450, y: 130 } }],
        edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], constraints: { minimumWorlds: 3, maximumWorlds: 3, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], forbiddenEdges: [{ from: 'w0', to: 'w2' }] }, editable: ['valuations'],
      },
      {
        id: 'witness-five', chapter: 'Countervaluations', title: 'Refute 5', concept: 'Failure of Euclideanness',
        instruction: 'Make ◇p → □◇p false at w0.', formula: '◇p → □◇p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 60 } }, { id: 'w1', atoms: '', position: { x: 90, y: 230 } }, { id: 'w2', atoms: '', position: { x: 400, y: 230 } }],
        edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], constraints: { minimumWorlds: 3, maximumWorlds: 3, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], maximumEdges: 2 }, bonusConstraints: { forbiddenAtoms: { w0: ['p'], w2: ['p'] } }, editable: ['valuations'],
      },
    ],
  },
  {
    id: 'engineering', title: 'Frame Engineering',
    description: 'Construct relations with required global properties and establish frame validity.',
    levels: [
      {
        id: 'frame-t', chapter: 'Frame Engineering', title: 'Reflexive foundation', concept: 'Axiom T on a frame',
        instruction: 'Make □p → p valid and satisfy the frame constraint.', formula: '□p → p', scope: 'frame', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
        edges: [], frameRules: { reflexive: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'frame-d', chapter: 'Frame Engineering', title: 'Serial foundation', concept: 'Axiom D on a frame',
        instruction: 'Make □p → ◇p valid and satisfy the frame constraint.', formula: '□p → ◇p', scope: 'frame', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
        edges: [], frameRules: { serial: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'frame-s4', chapter: 'Frame Engineering', title: 'Build an S4 frame', concept: 'Reflexivity and transitivity',
        instruction: 'Satisfy both frame constraints and make □p → □□p valid.', formula: '□p → □□p', scope: 'frame', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 70, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 260, y: 130 } }, { id: 'w2', atoms: '', position: { x: 450, y: 130 } }],
        edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], frameRules: { reflexive: 'validate', transitive: 'validate' }, constraints: { minimumWorlds: 3, maximumWorlds: 3, maximumEdges: 6 }, editable: ['edges'],
      },
      {
        id: 'frame-s5', chapter: 'Frame Engineering', title: 'Build an S5 cluster', concept: 'Reflexivity, symmetry, and transitivity together',
        instruction: 'Complete the connected frame so all three frame constraints hold and axiom 5 is valid.', formula: '◇p → □◇p', scope: 'frame', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 70, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 260, y: 130 } }, { id: 'w2', atoms: '', position: { x: 450, y: 130 } }],
        edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], frameRules: { reflexive: 'validate', symmetric: 'validate', transitive: 'validate' }, constraints: { minimumWorlds: 3, maximumWorlds: 3, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], maximumEdges: 9 }, editable: ['edges'],
      },
    ],
  },
  {
    id: 'correspondence', title: 'Correspondence Lab',
    description: 'Compare standard modal axioms with their characteristic relational properties on finite frames.',
    levels: [
      {
        id: 'correspondence-t', chapter: 'Correspondence', title: 'T and reflexivity', concept: 'T ↔ reflexivity',
        instruction: 'Satisfy the frame constraint and verify that both sides agree on this finite frame.', formula: '□p → p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: 't',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }], edges: [], frameRules: { reflexive: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'correspondence-d', chapter: 'Correspondence', title: 'D and seriality', concept: 'D ↔ seriality',
        instruction: 'Satisfy the frame constraint and verify that both sides agree on this finite frame.', formula: '□p → ◇p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: 'd',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }], edges: [], frameRules: { serial: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'correspondence-b', chapter: 'Correspondence', title: 'B and symmetry', concept: 'B ↔ symmetry',
        instruction: 'Satisfy the frame constraint and verify that both sides agree on this finite frame.', formula: 'p → □◇p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: 'b',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }], edges: [{ from: 'w0', to: 'w1' }], frameRules: { symmetric: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'correspondence-four', chapter: 'Correspondence', title: '4 and transitivity', concept: '4 ↔ transitivity',
        instruction: 'Satisfy the frame constraint and verify that both sides agree on this finite frame.', formula: '□p → □□p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: '4',
        worlds: [{ id: 'w0', atoms: '', position: { x: 70, y: 130 } }, { id: 'w1', atoms: '', position: { x: 260, y: 130 } }, { id: 'w2', atoms: '', position: { x: 450, y: 130 } }], edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], frameRules: { transitive: 'validate' }, constraints: { minimumWorlds: 3, maximumWorlds: 3, maximumEdges: 3 }, editable: ['edges'],
      },
      {
        id: 'correspondence-five', chapter: 'Correspondence', title: '5 and Euclideanness', concept: '5 ↔ Euclidean relation',
        instruction: 'Satisfy the frame constraint and verify that both sides agree on this finite frame.', formula: '◇p → □◇p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: '5',
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 70 } }, { id: 'w1', atoms: 'p', position: { x: 90, y: 230 } }, { id: 'w2', atoms: '', position: { x: 400, y: 230 } }], edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], frameRules: { euclidean: 'validate' }, constraints: { minimumWorlds: 3, maximumWorlds: 3, maximumEdges: 6 }, editable: ['edges'],
      },
      {
        id: 'correspondence-five-cluster', chapter: 'Correspondence', title: '5 on a larger cluster', concept: 'Euclidean closure with three alternatives',
        instruction: 'Complete the frame and verify that axiom 5 validity and Euclideanness agree on this finite instance.', formula: '◇p → □◇p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: '5',
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 35 } }, { id: 'w1', atoms: 'p', position: { x: 40, y: 230 } }, { id: 'w2', atoms: '', position: { x: 245, y: 270 } }, { id: 'w3', atoms: '', position: { x: 450, y: 230 } }],
        edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }, { from: 'w0', to: 'w3' }], frameRules: { euclidean: 'validate' }, constraints: { minimumWorlds: 4, maximumWorlds: 4, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }, { from: 'w0', to: 'w3' }], maximumEdges: 12 }, editable: ['edges'],
      },
      {
        id: 'correspondence-break-t', chapter: 'Correspondence', title: 'Break reflexivity', concept: 'A failed frame condition produces a countervaluation to T',
        instruction: 'Remove one loop so the frame is not reflexive and T is not valid.', formula: '□p → p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: 't',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }], edges: [{ from: 'w0', to: 'w0' }, { from: 'w1', to: 'w1' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 1, forbiddenProperties: ['reflexive'] }, editable: ['edges'],
      },
      {
        id: 'correspondence-break-b', chapter: 'Correspondence', title: 'Break symmetry', concept: 'A one-way edge produces a countervaluation to B',
        instruction: 'Remove the reverse edge so the frame is not symmetric and B is not valid.', formula: 'p → □◇p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: 'b',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }], edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, requiredEdges: [{ from: 'w0', to: 'w1' }], maximumEdges: 1, forbiddenProperties: ['symmetric'] }, editable: ['edges'],
      },
      {
        id: 'correspondence-break-four', chapter: 'Correspondence', title: 'Break transitivity', concept: 'A missing shortcut produces a countervaluation to 4',
        instruction: 'Remove the shortcut while retaining the path so transitivity and axiom 4 both fail.', formula: '□p → □□p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: '4',
        worlds: [{ id: 'w0', atoms: '', position: { x: 70, y: 130 } }, { id: 'w1', atoms: '', position: { x: 260, y: 130 } }, { id: 'w2', atoms: 'p', position: { x: 450, y: 130 } }], edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w0', to: 'w2' }], constraints: { minimumWorlds: 3, maximumWorlds: 3, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], maximumEdges: 2, forbiddenProperties: ['transitive'] }, editable: ['edges'],
      },
      {
        id: 'correspondence-break-five', chapter: 'Correspondence', title: 'Break Euclideanness', concept: 'A bare fork produces a countervaluation to 5',
        instruction: 'Remove the cluster edges while retaining the fork so Euclideanness and axiom 5 both fail.', formula: '◇p → □◇p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: '5',
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 70 } }, { id: 'w1', atoms: 'p', position: { x: 90, y: 230 } }, { id: 'w2', atoms: '', position: { x: 400, y: 230 } }], edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }, { from: 'w1', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w2', to: 'w1' }, { from: 'w2', to: 'w2' }], constraints: { minimumWorlds: 3, maximumWorlds: 3, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], maximumEdges: 2, forbiddenProperties: ['euclidean'] }, editable: ['edges'],
      },
    ],
  },
]
