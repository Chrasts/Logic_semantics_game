import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  MiniMapNode,
  Panel,
  ReactFlow,
  useNodesState,
  type Connection,
  type Edge as FlowEdge,
  type MiniMapNodeProps,
  type Node as FlowNode,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { campaignTracks, tutorialLevels, type GameLevel } from './campaign'
import {
  applyFrameProperties,
  checkConstructionConstraints,
  checkFrameProperty,
  describeConstructionConstraints,
  parseFormula,
  verifyObjective,
  type AccessibilityEdge,
  type FrameProperties,
  type FramePropertyName,
  type ObjectiveScope,
  type ObjectiveVerdict,
} from './logic'

interface EditableWorld {
  readonly key: number
  id: string
  atoms: string
  position: { x: number; y: number }
}

interface EditableEdge {
  readonly key: number
  from: string
  to: string
}

type VerificationResult =
  | { readonly kind: 'success' | 'failure'; readonly message: string; readonly detail: string; readonly verdict?: ObjectiveVerdict }
  | { readonly kind: 'error'; readonly message: string }
  | null

type EditorMode = 'edit' | 'evaluate'
type GameMode = 'sandbox' | 'tutorial' | 'campaign'
type GuideTab = 'theory' | 'controls' | 'objectives'
type AppView = 'workspace' | 'tutorial' | 'campaigns' | 'guide'
type EvaluationScope = ObjectiveScope
type FrameRuleMode = 'off' | 'validate' | 'enforce'
type FrameRules = Record<FramePropertyName, FrameRuleMode>

interface ModelSnapshot {
  readonly worlds: EditableWorld[]
  readonly edges: EditableEdge[]
  readonly evaluationWorld: string
  readonly frameRules: FrameRules
}

const initialWorlds: EditableWorld[] = [
  { key: 0, id: 'w0', atoms: '', position: { x: 90, y: 110 } },
  { key: 1, id: 'w1', atoms: 'p', position: { x: 390, y: 110 } },
]

const initialEdges: EditableEdge[] = [{ key: 0, from: 'w0', to: 'w1' }]
const storageKey = 'logic-game:sandbox:v1'
const campaignProgressKey = 'logic-game:campaign-progress:v1'
const explicitKeyFromFlowEdgeId = (id: string) => id.startsWith('explicit:') ? Number(id.slice(9)) : null
const defaultFrameRules: FrameRules = {
  reflexive: 'off',
  symmetric: 'off',
  transitive: 'off',
  euclidean: 'off',
  serial: 'off',
  irreflexive: 'off',
  acyclic: 'off',
}

const correspondencePresets = [
  { id: 't', name: 'T — Reflexivity', formula: '□p → p', property: 'reflexive' as const },
  { id: 'd', name: 'D — Seriality', formula: '□p → ◇p', property: 'serial' as const },
  { id: 'b', name: 'B — Symmetry', formula: 'p → □◇p', property: 'symmetric' as const },
  { id: '4', name: '4 — Transitivity', formula: '□p → □□p', property: 'transitive' as const },
  { id: '5', name: '5 — Euclidean', formula: '◇p → □◇p', property: 'euclidean' as const },
]

interface SandboxDraft {
  readonly formulaSource: string
  readonly worlds: EditableWorld[]
  readonly edges: EditableEdge[]
  readonly evaluationWorld: string
  readonly targetTruth: boolean
  readonly frameProperties?: FrameProperties
  readonly frameRules?: FrameRules
  readonly evaluationScope?: EvaluationScope | 'world'
}

function loadDraft(): SandboxDraft | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const draft = JSON.parse(raw) as Partial<SandboxDraft>
    if (
      typeof draft.formulaSource !== 'string'
      || !Array.isArray(draft.worlds)
      || !Array.isArray(draft.edges)
      || typeof draft.evaluationWorld !== 'string'
      || typeof draft.targetTruth !== 'boolean'
    ) return null
    return {
      ...draft,
      worlds: draft.worlds.map((world, index) => ({
        ...world,
        position: world.position && typeof world.position.x === 'number' && typeof world.position.y === 'number'
          ? world.position
          : { x: 90 + (index % 3) * 240, y: 90 + Math.floor(index / 3) * 150 },
      })),
    } as SandboxDraft
  } catch {
    return null
  }
}

function loadCampaignProgress(): ReadonlySet<string> {
  try {
    const stored = JSON.parse(localStorage.getItem(campaignProgressKey) ?? '[]')
    return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

export function App() {
  const [initialDraft] = useState(loadDraft)
  const [gameMode, setGameMode] = useState<GameMode>('sandbox')
  const [appView, setAppView] = useState<AppView>('workspace')
  const [campaignLevelIndex, setCampaignLevelIndex] = useState(0)
  const [campaignTrackIndex, setCampaignTrackIndex] = useState(0)
  const [playingTrackIndex, setPlayingTrackIndex] = useState<number | null>(null)
  const [completedLevelIds, setCompletedLevelIds] = useState<ReadonlySet<string>>(loadCampaignProgress)
  const [formulaSource, setFormulaSource] = useState(initialDraft?.formulaSource ?? '◇p')
  const [worlds, setWorlds] = useState(initialDraft?.worlds ?? initialWorlds)
  const [edges, setEdges] = useState(initialDraft?.edges ?? initialEdges)
  const [evaluationWorld, setEvaluationWorld] = useState(initialDraft?.evaluationWorld ?? 'w0')
  const [targetTruth, setTargetTruth] = useState(initialDraft?.targetTruth ?? true)
  const [evaluationScope, setEvaluationScope] = useState<EvaluationScope>(
    initialDraft?.evaluationScope === 'world' ? 'pointed' : initialDraft?.evaluationScope ?? 'pointed',
  )
  const [frameRules, setFrameRules] = useState<FrameRules>(() => {
    if (initialDraft?.frameRules) return { ...defaultFrameRules, ...initialDraft.frameRules }
    const legacy = initialDraft?.frameProperties
    return legacy ? {
      ...defaultFrameRules,
      reflexive: legacy.reflexive ? 'enforce' : 'off',
      symmetric: legacy.symmetric ? 'enforce' : 'off',
      transitive: legacy.transitive ? 'enforce' : 'off',
      euclidean: legacy.euclidean ? 'enforce' : 'off',
    } : defaultFrameRules
  })
  const [result, setResult] = useState<VerificationResult>(null)
  const [nextWorldKey, setNextWorldKey] = useState(() => Math.max(-1, ...worlds.map(({ key }) => key)) + 1)
  const [nextEdgeKey, setNextEdgeKey] = useState(() => Math.max(-1, ...edges.map(({ key }) => key)) + 1)
  const [selectedEdgeKey, setSelectedEdgeKey] = useState<number | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [guideTab, setGuideTab] = useState<GuideTab>('controls')
  const [showFrameRules, setShowFrameRules] = useState(false)
  const [selectedCorrespondence, setSelectedCorrespondence] = useState('')
  const [editorMode, setEditorMode] = useState<EditorMode>('edit')
  const [showDerivedEdges, setShowDerivedEdges] = useState(true)
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [selectedWorldKey, setSelectedWorldKey] = useState<number | null>(null)
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null)
  const historyPast = useRef<ModelSnapshot[]>([])
  const historyFuture = useRef<ModelSnapshot[]>([])
  const sandboxBeforeCampaign = useRef<SandboxDraft | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)

  const currentSnapshot = (): ModelSnapshot => ({
    worlds: structuredClone(worlds),
    edges: structuredClone(edges),
    evaluationWorld,
    frameRules: { ...frameRules },
  })

  const saveHistoryPoint = () => {
    historyPast.current.push(currentSnapshot())
    if (historyPast.current.length > 50) historyPast.current.shift()
    historyFuture.current = []
    setHistoryVersion((version) => version + 1)
  }

  const restoreSnapshot = (snapshot: ModelSnapshot) => {
    setWorlds(structuredClone(snapshot.worlds))
    setEdges(structuredClone(snapshot.edges))
    setEvaluationWorld(snapshot.evaluationWorld)
    setFrameRules({ ...snapshot.frameRules })
    setSelectedWorldKey(null)
    setResult(null)
  }

  const undo = () => {
    const previous = historyPast.current.pop()
    if (!previous) return
    historyFuture.current.push(currentSnapshot())
    restoreSnapshot(previous)
    setHistoryVersion((version) => version + 1)
  }

  const redo = () => {
    const next = historyFuture.current.pop()
    if (!next) return
    historyPast.current.push(currentSnapshot())
    restoreSnapshot(next)
    setHistoryVersion((version) => version + 1)
  }

  useEffect(() => {
    if (gameMode !== 'sandbox') return
    const draft: SandboxDraft = { formulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope }
    localStorage.setItem(storageKey, JSON.stringify(draft))
  }, [formulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope, gameMode])

  useEffect(() => {
    localStorage.setItem(campaignProgressKey, JSON.stringify([...completedLevelIds]))
  }, [completedLevelIds])

  useEffect(() => {
    if (!showHelp && !showFrameRules) return
    const closeDialog = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setShowHelp(false)
      setShowFrameRules(false)
    }
    window.addEventListener('keydown', closeDialog)
    return () => window.removeEventListener('keydown', closeDialog)
  }, [showHelp, showFrameRules])

  const usableWorldIds = useMemo(
    () => worlds.map(({ id }) => id.trim()).filter((id, index, ids) => id && ids.indexOf(id) === index),
    [worlds],
  )

  const effectiveEdges = useMemo(
    () => applyFrameProperties(usableWorldIds, edges, {
      reflexive: frameRules.reflexive === 'enforce',
      symmetric: frameRules.symmetric === 'enforce',
      transitive: frameRules.transitive === 'enforce',
      euclidean: frameRules.euclidean === 'enforce',
    }),
    [usableWorldIds, edges, frameRules],
  )

  const frameRuleResults = useMemo(
    () => Object.entries(frameRules)
      .filter(([, mode]) => mode !== 'off')
      .map(([property]) => checkFrameProperty(usableWorldIds, effectiveEdges, property as FramePropertyName)),
    [frameRules, usableWorldIds, effectiveEdges],
  )

  const explicitEdgeKeyByPair = useMemo(
    () => new Map(edges.map((edge) => [`${edge.from}\u0000${edge.to}`, edge.key])),
    [edges],
  )

  const displayedEdges = useMemo(
    () => showDerivedEdges
      ? effectiveEdges
      : effectiveEdges.filter((edge) => explicitEdgeKeyByPair.has(`${edge.from}\u0000${edge.to}`)),
    [effectiveEdges, explicitEdgeKeyByPair, showDerivedEdges],
  )

  const nodeBlueprints = useMemo<FlowNode[]>(() => worlds.map((world) => ({
    id: String(world.key),
    position: world.position,
    data: {
      label: (
        <div className="node-label">
          <strong>{world.id || 'unnamed'}</strong>
          <span>{world.atoms.trim() || '∅'}</span>
          {effectiveEdges.some((edge) => edge.from === world.id.trim() && edge.to === world.id.trim()) && (
            <span className="reflexive-badge" title={`${world.id} R ${world.id}`} aria-label="Reflexive relation">↻</span>
          )}
        </div>
      ),
    },
    className: [
      world.id.trim() === evaluationWorld ? 'evaluation-node' : '',
      world.key === selectedWorldKey ? 'selected-world-node' : '',
    ].filter(Boolean).join(' '),
    ariaLabel: `World ${world.id || 'without a name'}, atoms ${world.atoms || 'none'}`,
  })), [worlds, effectiveEdges, evaluationWorld, selectedWorldKey])

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodeBlueprints)

  useEffect(() => {
    setFlowNodes(nodeBlueprints)
  }, [nodeBlueprints, setFlowNodes])

  const worldKeyById = useMemo(
    () => new Map(worlds.map((world) => [world.id.trim(), String(world.key)])),
    [worlds],
  )

  const flowEdges = useMemo<FlowEdge[]>(() => displayedEdges.flatMap((edge) => {
    const source = worldKeyById.get(edge.from)
    const target = worldKeyById.get(edge.to)
    const explicitKey = explicitEdgeKeyByPair.get(`${edge.from}\u0000${edge.to}`)
    return source && target && source !== target ? [{
      id: explicitKey === undefined ? `derived:${edge.from}:${edge.to}` : `explicit:${explicitKey}`,
      source,
      target,
      markerEnd: { type: MarkerType.ArrowClosed },
      selectable: explicitKey !== undefined,
      focusable: explicitKey !== undefined,
      selected: explicitKey === selectedEdgeKey,
      className: explicitKey === undefined
        ? 'model-edge derived-edge'
        : explicitKey === selectedEdgeKey ? 'model-edge selected-edge' : 'model-edge',
    }] : []
  }), [displayedEdges, worldKeyById, explicitEdgeKeyByPair, selectedEdgeKey])

  const MiniMapWithRelations = useMemo(() => {
    const worldByKey = new Map(worlds.map((world) => [String(world.key), world]))
    const keyByWorldId = new Map(worlds.map((world) => [world.id.trim(), String(world.key)]))
    const relationPairs = displayedEdges
      .filter((edge) => edge.from !== edge.to)
      .map((edge) => ({ source: keyByWorldId.get(edge.from), target: keyByWorldId.get(edge.to) }))

    return function RelationMiniMapNode(props: MiniMapNodeProps) {
      const sourceWorld = worldByKey.get(props.id)
      const diameter = Math.min(props.width, props.height) * 0.62
      const circleX = props.x + props.width / 2 - diameter / 2
      const circleY = props.y + props.height / 2 - diameter / 2
      return (
        <g>
          {sourceWorld && relationPairs
            .filter((pair) => pair.source === props.id && pair.target)
            .map((pair) => {
              const targetWorld = worldByKey.get(pair.target!)
              if (!targetWorld) return null
              return (
                <line
                  key={`${pair.source}-${pair.target}`}
                  x1={props.x + props.width / 2}
                  y1={props.y + props.height / 2}
                  x2={targetWorld.position.x + 64}
                  y2={targetWorld.position.y + 30}
                  className="minimap-relation"
                />
              )
            })}
          <MiniMapNode
            {...props}
            x={circleX}
            y={circleY}
            width={diameter}
            height={diameter}
          />
        </g>
      )
    }
  }, [worlds, displayedEdges])

  const selectedWorld = worlds.find((world) => world.key === selectedWorldKey) ?? null
  const selectedTrack = campaignTracks[campaignTrackIndex]
  const playingTrack = campaignTracks[playingTrackIndex ?? campaignTrackIndex]
  const activeLevels = gameMode === 'tutorial' ? tutorialLevels : gameMode === 'campaign' ? playingTrack.levels : []
  const activeLevel = gameMode === 'sandbox' ? null : activeLevels[campaignLevelIndex] ?? null
  const tutorialCompleted = tutorialLevels.filter((level) => completedLevelIds.has(level.id)).length
  const nextTutorialIndex = tutorialLevels.findIndex((level) => !completedLevelIds.has(level.id))
  const selectedTrackCompleted = selectedTrack.levels.filter((level) => completedLevelIds.has(level.id)).length
  const nextSelectedLevelIndex = selectedTrack.levels.findIndex((level) => !completedLevelIds.has(level.id))
  const overallCampaignLevels = campaignTracks.reduce((total, track) => total + track.levels.length, 0)
  const overallCampaignCompleted = campaignTracks.reduce((total, track) => total + track.levels.filter((level) => completedLevelIds.has(level.id)).length, 0)
  const isGuidedMode = gameMode !== 'sandbox'
  const canEditWorlds = editorMode === 'edit' && (!activeLevel || activeLevel.editable.includes('worlds'))
  const canEditValuations = editorMode === 'edit' && (!activeLevel || activeLevel.editable.includes('valuations'))
  const canEditEdges = editorMode === 'edit' && (!activeLevel || activeLevel.editable.includes('edges'))
  const canEditConstraints = !activeLevel || activeLevel.editable.includes('constraints')
  const canEditEvaluation = !activeLevel || activeLevel.editable.includes('evaluation')

  const updateWorld = (key: number, field: 'id' | 'atoms', value: string) => {
    const previous = worlds.find((world) => world.key === key)
    setWorlds((current) => current.map((world) => world.key === key ? { ...world, [field]: value } : world))
    if (field === 'id' && previous) {
      const oldId = previous.id.trim()
      const newId = value.trim()
      setEdges((current) => current.map((edge) => ({
        ...edge,
        from: edge.from === oldId ? newId : edge.from,
        to: edge.to === oldId ? newId : edge.to,
      })))
      if (evaluationWorld === oldId) setEvaluationWorld(newId)
    }
    setResult(null)
  }

  const addWorld = () => {
    saveHistoryPoint()
    const used = new Set(worlds.map(({ id }) => id))
    let number = worlds.length
    while (used.has(`w${number}`)) number += 1
    setWorlds((current) => [...current, {
      key: nextWorldKey,
      id: `w${number}`,
      atoms: '',
      position: { x: 90 + (current.length % 3) * 240, y: 90 + Math.floor(current.length / 3) * 150 },
    }])
    setNextWorldKey((key) => key + 1)
    setResult(null)
  }

  const removeWorld = (key: number) => {
    saveHistoryPoint()
    const removed = worlds.find((world) => world.key === key)
    const remainingWorlds = worlds.filter((world) => world.key !== key)
    setWorlds(remainingWorlds)
    if (removed) {
      const removedId = removed.id.trim()
      setEdges((current) => current.filter(({ from, to }) => from !== removedId && to !== removedId))
      if (evaluationWorld === removedId) setEvaluationWorld(remainingWorlds[0]?.id.trim() ?? '')
    }
    setSelectedWorldKey((current) => current === key ? null : current)
    setResult(null)
  }

  const addEdge = () => {
    saveHistoryPoint()
    const fallback = usableWorldIds[0] ?? ''
    setEdges((current) => [...current, { key: nextEdgeKey, from: fallback, to: fallback }])
    setNextEdgeKey((key) => key + 1)
    setResult(null)
  }

  const connectWorlds = (connection: Connection) => {
    const source = worlds.find(({ key }) => String(key) === connection.source)?.id.trim()
    const target = worlds.find(({ key }) => String(key) === connection.target)?.id.trim()
    if (!source || !target) return
    if (edges.some((edge) => edge.from === source && edge.to === target)) return
    saveHistoryPoint()
    setEdges((current) => [...current, { key: nextEdgeKey, from: source, to: target }])
    setNextEdgeKey((key) => key + 1)
    setResult(null)
  }

  const deleteEdge = (key: number) => {
    saveHistoryPoint()
    setEdges((current) => current.filter((edge) => edge.key !== key))
    setSelectedEdgeKey((current) => current === key ? null : current)
    setResult(null)
  }

  const loadLevel = (index: number, levels: readonly GameLevel[] = activeLevels) => {
    const level = levels[index]
    if (!level) return
    setCampaignLevelIndex(index)
    setFormulaSource(level.formula)
    setWorlds(level.worlds.map((world, key) => ({ ...world, key })))
    setEdges(level.edges.map((edge, key) => ({ ...edge, key })))
    setEvaluationWorld(level.evaluationWorld)
    setTargetTruth(level.targetTruth)
    setEvaluationScope(level.scope)
    setSelectedCorrespondence(level.correspondencePreset ?? '')
    setFrameRules({ ...defaultFrameRules, ...level.frameRules })
    setNextWorldKey(level.worlds.length)
    setNextEdgeKey(level.edges.length)
    setSelectedWorldKey(null)
    setSelectedEdgeKey(null)
    setEditorMode('edit')
    setResult(null)
    historyPast.current = []
    historyFuture.current = []
    setHistoryVersion((version) => version + 1)
  }

  const enterGuidedMode = (mode: 'tutorial' | 'campaign') => {
    if (gameMode === 'sandbox') {
      sandboxBeforeCampaign.current = { formulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope }
    }
    setGameMode(mode)
    const levels = mode === 'tutorial' ? tutorialLevels : campaignTracks[campaignTrackIndex].levels
    loadLevel(0, levels)
  }

  const startGuidedLevel = (mode: 'tutorial' | 'campaign', index: number, trackIndex = campaignTrackIndex) => {
    if (gameMode === 'sandbox') {
      sandboxBeforeCampaign.current = { formulaSource, worlds, edges, evaluationWorld, targetTruth, frameRules, evaluationScope }
    }
    if (mode === 'campaign') setCampaignTrackIndex(trackIndex)
    if (mode === 'campaign') setPlayingTrackIndex(trackIndex)
    setGameMode(mode)
    const levels = mode === 'tutorial' ? tutorialLevels : campaignTracks[trackIndex].levels
    loadLevel(index, levels)
    setAppView('workspace')
  }

  const returnToSandbox = () => {
    if (isGuidedMode) exitCampaign()
    setAppView('workspace')
  }

  const selectCampaignTrack = (index: number) => {
    setCampaignTrackIndex(index)
    setPlayingTrackIndex(index)
    loadLevel(0, campaignTracks[index].levels)
  }

  const exitCampaign = () => {
    const draft = sandboxBeforeCampaign.current
    setGameMode('sandbox')
    if (!draft) return
    setFormulaSource(draft.formulaSource)
    setWorlds(draft.worlds)
    setEdges(draft.edges)
    setEvaluationWorld(draft.evaluationWorld)
    setTargetTruth(draft.targetTruth)
    setFrameRules({ ...defaultFrameRules, ...draft.frameRules })
    setEvaluationScope(draft.evaluationScope === 'world' ? 'pointed' : draft.evaluationScope ?? 'pointed')
    setNextWorldKey(Math.max(-1, ...draft.worlds.map(({ key }) => key)) + 1)
    setNextEdgeKey(Math.max(-1, ...draft.edges.map(({ key }) => key)) + 1)
    setSelectedCorrespondence('')
    setResult(null)
  }

  const resetSandbox = () => {
    if (gameMode !== 'sandbox') {
      loadLevel(campaignLevelIndex)
      return
    }
    if (!window.confirm('Reset the sandbox? The current model will be replaced.')) return
    saveHistoryPoint()
    setFormulaSource('◇p')
    setWorlds(initialWorlds)
    setEdges(initialEdges)
    setEvaluationWorld('w0')
    setTargetTruth(true)
    setFrameRules(defaultFrameRules)
    setEvaluationScope('pointed')
    setSelectedCorrespondence('')
    setNextWorldKey(2)
    setNextEdgeKey(1)
    setSelectedEdgeKey(null)
    setResult(null)
  }

  const loadCorrespondencePreset = (presetId: string) => {
    setSelectedCorrespondence(presetId)
    const preset = correspondencePresets.find(({ id }) => id === presetId)
    if (!preset) return
    saveHistoryPoint()
    setFormulaSource(preset.formula)
    setEvaluationScope('correspondence')
    setTargetTruth(true)
    setResult(null)
  }

  const verify = () => {
    try {
      const ids = worlds.map(({ id }) => id.trim())
      if (ids.length === 0) throw new Error('Add at least one world before verification.')
      if (ids.some((id) => !id)) throw new Error('Every world must have a name.')
      if (new Set(ids).size !== ids.length) throw new Error('World names must be unique.')
      if (evaluationScope === 'pointed' && !ids.includes(evaluationWorld)) throw new Error('Select an existing evaluation world.')

      const valuations = Object.fromEntries(worlds.map(({ id, atoms }) => [
        id.trim(),
        atoms.split(/[\s,]+/u).map((value) => value.trim()).filter(Boolean),
      ]))
      const explicitEdges: AccessibilityEdge[] = edges.map(({ from, to }) => ({ from, to }))
      const normalizedEdges: AccessibilityEdge[] = effectiveEdges.map(({ from, to }) => ({ from, to }))
      const constraintViolation = activeLevel?.constraints && checkConstructionConstraints({
        worldIds: ids,
        explicitEdges,
        effectiveEdges: normalizedEdges,
        valuation: valuations,
      }, activeLevel.constraints)[0]
      if (constraintViolation) {
        setResult({ kind: 'failure', message: 'Construction constraint not met', detail: constraintViolation })
        return
      }

      const requiredRule = Object.entries(activeLevel?.requiredFrameRules ?? {})
        .find(([property, mode]) => frameRules[property as FramePropertyName] !== mode)
      if (requiredRule) {
        const [property, mode] = requiredRule
        setResult({ kind: 'failure', message: 'Frame constraint not configured', detail: `Set ${property} to ${mode}.` })
        return
      }

      const failedRule = frameRuleResults.find((result) => !result.holds)
      if (failedRule) {
        setResult({
          kind: 'failure',
          message: `The frame is not ${failedRule.property}.`,
          detail: failedRule.violations[0] ?? 'The selected frame rule is violated.',
        })
        return
      }

      const preset = correspondencePresets.find(({ id }) => id === selectedCorrespondence)
      const verdict = verifyObjective({
        scope: evaluationScope,
        targetTruth,
        evaluationWorld,
        correspondenceProperty: preset?.property,
      }, {
        worldIds: ids,
        edges: normalizedEdges,
        valuation: valuations,
        formula: parseFormula(formulaSource),
      })
      setResult({
        kind: verdict.success ? 'success' : 'failure',
        message: verdict.headline,
        detail: verdict.formula.summary,
        verdict,
      })
      if (verdict.success && activeLevel) {
        setCompletedLevelIds((current) => new Set([...current, activeLevel.id]))
      }
    } catch (error) {
      setResult({ kind: 'error', message: error instanceof Error ? error.message : 'Verification failed.' })
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">◇</span><strong>Logic Model Builder</strong><nav className="product-nav" aria-label="Game modes"><button className={appView === 'workspace' && gameMode === 'sandbox' ? 'active' : ''} type="button" onClick={returnToSandbox}>Sandbox</button><button className={appView === 'tutorial' ? 'active' : ''} type="button" onClick={() => setAppView('tutorial')}>Tutorial</button><button className={appView === 'campaigns' ? 'active' : ''} type="button" onClick={() => setAppView('campaigns')}>Campaigns</button><button className={appView === 'guide' ? 'active' : ''} type="button" onClick={() => setAppView('guide')}>Guide</button></nav></div>
        <div className="topbar-actions">
          {appView === 'workspace' && <>
          <button type="button" className="icon-button" onClick={undo} disabled={historyPast.current.length === 0} aria-label="Undo" title="Undo">↶</button>
          <button type="button" className="icon-button" onClick={redo} disabled={historyFuture.current.length === 0} aria-label="Redo" title="Redo">↷</button>
          <button type="button" className="icon-button" onClick={() => setLeftPanelOpen((open) => !open)} aria-label="Toggle left panels" aria-pressed={!leftPanelOpen} title="Toggle left panels">◧</button>
          <button type="button" className="icon-button" onClick={() => setRightPanelOpen((open) => !open)} aria-label="Toggle right panels" aria-pressed={!rightPanelOpen} title="Toggle right panels">◨</button>
          </>}
          {appView === 'workspace' && <button type="button" className="text-button" onClick={resetSandbox}>{isGuidedMode ? 'Restart level' : 'Reset model'}</button>}
          {appView === 'workspace' && <button type="button" className="help-button" onClick={() => { setGuideTab('controls'); setShowHelp(true) }}>Controls</button>}
        </div>
      </header>

      {appView === 'tutorial' && (
        <section className="content-screen tutorial-screen" aria-labelledby="tutorial-screen-title">
          <div className="screen-hero"><div><p className="eyebrow">Learn the interface</p><h1 id="tutorial-screen-title">Game Tutorial</h1><p>Eight short steps introduce evaluation worlds, model editing, relations, semantic scopes, frame constraints, and correspondence.</p></div><div className="hero-action"><strong>{tutorialCompleted}/{tutorialLevels.length}</strong><span>steps complete</span><div className="progress-meter" aria-label={`${tutorialCompleted} of ${tutorialLevels.length} tutorial steps complete`}><i style={{ width: `${tutorialCompleted / tutorialLevels.length * 100}%` }} /></div><button type="button" className="primary-action" onClick={() => startGuidedLevel('tutorial', nextTutorialIndex < 0 ? 0 : nextTutorialIndex)}>{tutorialCompleted === 0 ? 'Start tutorial' : tutorialCompleted === tutorialLevels.length ? 'Replay tutorial' : 'Continue tutorial'}</button></div></div>
          <div className="screen-note"><strong>How it works</strong><span>Each step loads a controlled model. Change only the unlocked parts, then use Verify objective. Progress is stored in this browser.</span></div>
          <div className="level-browser">{tutorialLevels.map((level, index) => <article className={completedLevelIds.has(level.id) ? 'complete' : ''} key={level.id}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{level.title}</h2><p>{level.concept}</p></div><b>{completedLevelIds.has(level.id) ? 'Complete' : 'Not completed'}</b><button type="button" onClick={() => startGuidedLevel('tutorial', index)}>{gameMode === 'tutorial' && campaignLevelIndex === index ? 'Continue' : 'Play'}</button></article>)}</div>
        </section>
      )}

      {appView === 'campaigns' && (
        <section className="content-screen campaign-screen" aria-labelledby="campaign-screen-title">
          <div className="screen-hero compact"><div><p className="eyebrow">Choose a path</p><h1 id="campaign-screen-title">Campaigns</h1><p>Five families organize seventeen missions by semantic objective and construction style.</p></div><div className="collection-progress"><strong>{overallCampaignCompleted}/{overallCampaignLevels}</strong><span>missions complete</span><div className="progress-meter" aria-label={`${overallCampaignCompleted} of ${overallCampaignLevels} campaign missions complete`}><i style={{ width: `${overallCampaignCompleted / overallCampaignLevels * 100}%` }} /></div></div></div>
          <div className="campaign-browser">
            <aside className="track-list" aria-label="Campaign list">{campaignTracks.map((track, index) => { const completed = track.levels.filter((level) => completedLevelIds.has(level.id)).length; return <button type="button" className={campaignTrackIndex === index ? 'active' : ''} onClick={() => setCampaignTrackIndex(index)} key={track.id}><strong>{track.title}</strong><span>{completed}/{track.levels.length} complete</span></button> })}</aside>
            <div className="track-detail"><div className="track-heading"><div><p className="eyebrow">Campaign · {selectedTrackCompleted}/{selectedTrack.levels.length} complete</p><h2>{selectedTrack.title}</h2><p>{selectedTrack.description}</p></div><button type="button" className="primary-action" onClick={() => startGuidedLevel('campaign', nextSelectedLevelIndex < 0 ? 0 : nextSelectedLevelIndex, campaignTrackIndex)}>{selectedTrackCompleted === 0 ? 'Start campaign' : selectedTrackCompleted === selectedTrack.levels.length ? 'Replay campaign' : 'Continue campaign'}</button></div><div className="level-browser">{selectedTrack.levels.map((level, index) => <article className={completedLevelIds.has(level.id) ? 'complete' : ''} key={level.id}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{level.title}</h3><p>{level.concept}</p></div><b>{completedLevelIds.has(level.id) ? 'Complete' : 'Not completed'}</b><button type="button" onClick={() => gameMode === 'campaign' && playingTrackIndex === campaignTrackIndex && campaignLevelIndex === index ? setAppView('workspace') : startGuidedLevel('campaign', index, campaignTrackIndex)}>{gameMode === 'campaign' && playingTrackIndex === campaignTrackIndex && campaignLevelIndex === index ? 'Resume' : completedLevelIds.has(level.id) ? 'Replay' : 'Play'}</button></article>)}</div></div>
          </div>
        </section>
      )}

      {appView === 'guide' && (
        <section className="content-screen guide-screen" aria-labelledby="guide-screen-title">
          <div className="screen-hero compact"><div><p className="eyebrow">Reference</p><h1 id="guide-screen-title">Guide</h1><p>Modal semantics, application controls, and the vocabulary used to define levels.</p></div>{isGuidedMode && <button type="button" className="secondary-button" onClick={() => setAppView('workspace')}>Return to current mission</button>}</div>
          <div className="guide-tabs" role="tablist" aria-label="Guide sections"><button type="button" role="tab" aria-selected={guideTab === 'theory'} className={guideTab === 'theory' ? 'active' : ''} onClick={() => setGuideTab('theory')}>Modal logic</button><button type="button" role="tab" aria-selected={guideTab === 'controls'} className={guideTab === 'controls' ? 'active' : ''} onClick={() => setGuideTab('controls')}>Controls</button><button type="button" role="tab" aria-selected={guideTab === 'objectives'} className={guideTab === 'objectives' ? 'active' : ''} onClick={() => setGuideTab('objectives')}>Objectives & constraints</button></div>
          <div className="guide-page-grid">
            {guideTab === 'theory' && <><article><h2>Frames and models</h2><p>F = ⟨W,R⟩ and M = ⟨W,R,ν⟩, with ν: Prop → ℘(W).</p></article><article><h2>Satisfaction</h2><p>M,w ⊨ φ states truth at w. □ quantifies over all accessible worlds; ◇ over at least one.</p></article><article><h2>Modal clauses</h2><p>M,w ⊨ □φ iff every v with wRv satisfies φ. M,w ⊨ ◇φ iff some such v satisfies φ.</p></article><article><h2>Global scopes</h2><p>M ⊨ φ checks every world under ν; F ⊨ φ additionally checks every valuation.</p></article></>}
            {guideTab === 'controls' && <><article><h2>Worlds</h2><p>Add, rename, move, value, select, or delete worlds from the map and side panels.</p></article><article><h2>Relations</h2><p>Drag between handles or use Accessibility. Select or double-click explicit edges to delete them.</p></article><article><h2>Workspace</h2><p>Undo, redo, collapse panels, fit the map, inspect the minimap, and open Controls while playing.</p></article></>}
            {guideTab === 'objectives' && <><article><h2>Objective scopes</h2><p>Pointed, model-global, frame-validity, and correspondence objectives use different semantic quantification.</p></article><article><h2>Construction constraints</h2><p>Levels can bound size, require or forbid edges and atoms, and require or exclude frame properties.</p></article><article><h2>Locked inputs</h2><p>Formulas, worlds, valuations, relations, evaluation worlds, and constraint controls may be fixed.</p></article></>}
          </div>
        </section>
      )}

      {appView === 'workspace' && activeLevel && (
        <section className="mission-hud" aria-label="Current level">
          <div className="mission-context">
            {gameMode === 'campaign' && (
              <label className="campaign-track-picker"><span>Campaign</span><select aria-label="Campaign track" value={playingTrackIndex ?? campaignTrackIndex} onChange={(event) => selectCampaignTrack(Number(event.target.value))}>{campaignTracks.map((track, index) => <option key={track.id} value={index}>{track.title}</option>)}</select><small>{playingTrack.description}</small></label>
            )}
            <div className="campaign-progress"><span>{activeLevel.chapter} · {campaignLevelIndex + 1}/{activeLevels.length}</span>{completedLevelIds.has(activeLevel.id) && <b>Complete</b>}</div>
            <strong>{activeLevel.title}</strong>
            <small>{activeLevel.concept}</small>
          </div>
          <div className="mission-copy">
            {activeLevel.briefing && <p className="tutorial-briefing">{activeLevel.briefing}</p>}
            <div className="level-objective"><span>Objective</span><p>{activeLevel.instruction}</p></div>
            {(activeLevel.constraints || activeLevel.frameRules || activeLevel.requiredFrameRules) && <div className="level-constraints"><span>Constraints</span><small>{[
              ...describeConstructionConstraints(activeLevel.constraints ?? {}),
              ...Object.entries(activeLevel.frameRules ?? {}).filter(([, mode]) => mode !== 'off').map(([property]) => property),
              ...Object.entries(activeLevel.requiredFrameRules ?? {}).map(([property, mode]) => `${property}: ${mode}`),
            ].filter(Boolean).join(' · ')}</small></div>}
          </div>
          <div className="campaign-navigation">
            <button type="button" disabled={campaignLevelIndex === 0} onClick={() => loadLevel(campaignLevelIndex - 1)}>Previous</button>
            <button type="button" disabled={!completedLevelIds.has(activeLevel.id) || campaignLevelIndex === activeLevels.length - 1} onClick={() => loadLevel(campaignLevelIndex + 1)}>Next level</button>
          </div>
        </section>
      )}

      {appView === 'workspace' && <section className={`workspace ${!leftPanelOpen ? 'left-collapsed' : ''} ${!rightPanelOpen ? 'right-collapsed' : ''}`} aria-label="Kripke model editor">
        <div className="panel formula-panel">
          <div className="panel-heading">
            <span className="step">01</span>
            <div><h2>Formula and goal</h2><p>Unicode and text notation</p></div>
          </div>
          <label className="field">
            <span>Modal formula</span>
            <input disabled={isGuidedMode} value={formulaSource} onChange={(event) => { setFormulaSource(event.target.value); setResult(null) }} spellCheck={false} />
          </label>
          <div className="symbol-row" aria-label="Insert symbol">
            {['¬', '∧', '∨', '→', '□', '◇'].map((symbol) => (
              <button key={symbol} type="button" disabled={isGuidedMode} className="symbol-button" aria-label={`Insert ${symbol}`} onClick={() => setFormulaSource((value) => value + symbol)}>{symbol}</button>
            ))}
          </div>
          <label className="field scope-picker">
            <span>Semantic target</span>
            <select disabled={isGuidedMode} aria-label="Semantic target" value={evaluationScope} onChange={(event) => { setEvaluationScope(event.target.value as EvaluationScope); setResult(null) }}>
              <option value="pointed">Pointed model — selected world, current valuation</option>
              <option value="model">Model — all worlds, current valuation</option>
              <option value="frame">Frame — all worlds and all valuations</option>
              <option value="correspondence">Correspondence — formula validity vs. relation</option>
            </select>
          </label>
          {evaluationScope !== 'correspondence' ? (
            <fieldset className="target-choice">
              <legend>Construction goal</legend>
              <label><input type="radio" disabled={isGuidedMode} checked={targetTruth} onChange={() => { setTargetTruth(true); setResult(null) }} /> {evaluationScope === 'frame' ? 'Make valid on frame' : 'Make formula true'}</label>
              <label><input type="radio" disabled={isGuidedMode} checked={!targetTruth} onChange={() => { setTargetTruth(false); setResult(null) }} /> {evaluationScope === 'frame' ? 'Find countervaluation' : 'Build a counterexample'}</label>
            </fieldset>
          ) : <p className="objective-explainer">Compare validity under every valuation with a characteristic property of the accessibility relation.</p>}
          <label className={`field correspondence-picker ${evaluationScope === 'correspondence' ? 'active' : ''}`}>
            <span>Correspondence lab</span>
            <select disabled={isGuidedMode} value={selectedCorrespondence} onChange={(event) => loadCorrespondencePreset(event.target.value)}>
              <option value="">Choose an axiom preset</option>
              {correspondencePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
            </select>
          </label>
          {selectedCorrespondence && <p className="correspondence-note">Compare frame validity with the selected relational property. Finite examples provide evidence; they do not replace the general correspondence proof.</p>}
          <p className="notation">Precedence: ¬ □ ◇ &gt; ∧ &gt; ∨ &gt; →. Alternatives: !, &amp;, |, -&gt;, box, diamond.</p>
        </div>

        <div className="panel graph-panel">
          <div className="panel-heading">
            <span className="step">02</span>
            <div><h2>Visual model</h2><p>Drag worlds and connect their handles</p></div>
          </div>
          <div className="graph-canvas">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              onInit={setFlowInstance}
              onNodesChange={onNodesChange}
              nodesDraggable={editorMode === 'edit'}
              nodesConnectable={canEditEdges}
              edgesFocusable={canEditEdges}
              onNodeDragStart={saveHistoryPoint}
              onNodeDragStop={(_event, node) => setWorlds((current) => current.map((world) => world.key === Number(node.id) ? { ...world, position: node.position } : world))}
              onNodeClick={(_event, node) => {
                const selectedWorld = worlds.find(({ key }) => key === Number(node.id))
                setSelectedWorldKey(Number(node.id))
                if (canEditEvaluation && selectedWorld?.id.trim() && selectedWorld.id.trim() !== evaluationWorld) {
                  saveHistoryPoint()
                  setEvaluationWorld(selectedWorld.id.trim())
                }
                setResult(null)
              }}
              onConnect={connectWorlds}
              onEdgeClick={(_event, edge) => setSelectedEdgeKey(explicitKeyFromFlowEdgeId(edge.id))}
              onEdgeDoubleClick={(_event, edge) => {
                const key = explicitKeyFromFlowEdgeId(edge.id)
                if (key !== null) deleteEdge(key)
              }}
              onEdgesDelete={(deleted) => deleted.forEach(({ id }) => {
                const key = explicitKeyFromFlowEdgeId(id)
                if (key !== null) deleteEdge(key)
              })}
              onPaneClick={() => { setSelectedEdgeKey(null); setSelectedWorldKey(null) }}
              deleteKeyCode={canEditEdges ? ['Backspace', 'Delete'] : null}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              minZoom={0.35}
              maxZoom={1.8}
              colorMode="light"
            >
              <Panel position="top-left" className="map-toolbar">
                <div className="mode-switch" aria-label="Editor mode">
                  <button type="button" className={editorMode === 'edit' ? 'active' : ''} aria-pressed={editorMode === 'edit'} onClick={() => setEditorMode('edit')}>Edit</button>
                  <button type="button" className={editorMode === 'evaluate' ? 'active' : ''} aria-pressed={editorMode === 'evaluate'} onClick={() => setEditorMode('evaluate')}>Evaluate</button>
                </div>
                <button type="button" onClick={addWorld} disabled={!canEditWorlds}>+ World</button>
                <button type="button" onClick={() => flowInstance?.fitView({ padding: .25, duration: 250 })}>Fit view</button>
                <button type="button" className={!showDerivedEdges ? 'muted' : ''} onClick={() => setShowDerivedEdges((show) => !show)}>{showDerivedEdges ? 'Hide' : 'Show'} derived</button>
                <button type="button" className="frame-rules-button" onClick={() => setShowFrameRules(true)}>Constraints{frameRuleResults.length ? ` (${frameRuleResults.length})` : ''}</button>
                {editorMode === 'evaluate' && <button type="button" className="toolbar-verify" onClick={verify}>Verify</button>}
              </Panel>
              {worlds.length === 0 && (
                <Panel position="top-center" className="empty-graph-state">
                  <strong>Start with a world</strong><span>Then connect worlds to define accessibility.</span>
                  <button type="button" onClick={addWorld} disabled={!canEditWorlds}>Add first world</button>
                </Panel>
              )}
              {selectedWorld && (
                <Panel position="bottom-left" className="world-inspector">
                  <div className="inspector-heading"><strong>{selectedWorld.id || 'Unnamed world'}</strong><button type="button" onClick={() => setSelectedWorldKey(null)} aria-label="Close world inspector">×</button></div>
                  <label><span>Name</span><input disabled={!canEditWorlds} value={selectedWorld.id} onFocus={saveHistoryPoint} onChange={(event) => updateWorld(selectedWorld.key, 'id', event.target.value)} /></label>
                  <label><span>True atoms</span><input disabled={!canEditValuations} value={selectedWorld.atoms} onFocus={saveHistoryPoint} onChange={(event) => updateWorld(selectedWorld.key, 'atoms', event.target.value)} /></label>
                  <div className="inspector-actions">
                    <button type="button" onClick={() => setEvaluationWorld(selectedWorld.id.trim())} disabled={!selectedWorld.id.trim() || !canEditEvaluation}>Set as evaluation world</button>
                    {canEditWorlds && <button type="button" className="danger" onClick={() => removeWorld(selectedWorld.key)}>Delete</button>}
                  </div>
                </Panel>
              )}
              <Background color="#b9b6aa" gap={24} size={1} />
              <MiniMap
                pannable
                zoomable
                nodeComponent={MiniMapWithRelations}
                nodeColor={(node) => node.className === 'evaluation-node' ? '#14647a' : '#a45127'}
                nodeStrokeColor="#f8f7f1"
                nodeStrokeWidth={2}
                nodeBorderRadius={50}
                maskColor="rgba(236, 233, 223, .62)"
                ariaLabel="Model overview and viewport control"
              />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          <div className="graph-toolbar">
            <button type="button" className="delete-edge-button" disabled={selectedEdgeKey === null || !canEditEdges} onClick={() => selectedEdgeKey !== null && deleteEdge(selectedEdgeKey)}>
              Delete selected edge
            </button>
          </div>
        </div>

        <div className="panel model-panel">
          <div className="panel-heading">
            <span className="step">03</span>
            <div><h2>Worlds and valuations</h2><p>Separate atoms with spaces or commas</p></div>
          </div>
          <div className="world-list">
            {worlds.length === 0 && <div className="empty-card"><strong>No worlds yet</strong><span>Add a world to start building a model.</span></div>}
            {worlds.map((world, index) => (
              <div className="world-row" key={world.key}>
                <span className="world-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <label><span>World</span><input disabled={!canEditWorlds} value={world.id} onFocus={saveHistoryPoint} onChange={(event) => updateWorld(world.key, 'id', event.target.value)} /></label>
                <label className="atoms-field"><span>True atoms</span><input disabled={!canEditValuations} value={world.atoms} placeholder="p, q" onFocus={saveHistoryPoint} onChange={(event) => updateWorld(world.key, 'atoms', event.target.value)} /></label>
                <button type="button" className="remove-button" disabled={!canEditWorlds} onClick={() => removeWorld(world.key)} aria-label={`Delete world ${world.id}`}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className="secondary-button" onClick={addWorld} disabled={!canEditWorlds}>+ Add world</button>
        </div>

        <div className="panel edge-panel">
          <div className="panel-heading">
            <span className="step">04</span>
            <div><h2>Accessibility</h2><p>Directed edges and reflexivity</p></div>
          </div>
          <div className="edge-list">
            {edges.length === 0 && <p className="empty-state">The model has no explicit edges.</p>}
            {edges.map((edge) => (
              <div className="edge-row" key={edge.key}>
                <span className="edge-mark" aria-hidden="true">R</span>
                <select disabled={!canEditEdges} aria-label="Edge source world" value={edge.from} onFocus={saveHistoryPoint} onChange={(event) => setEdges((current) => current.map((item) => item.key === edge.key ? { ...item, from: event.target.value } : item))}>
                  <option value="">—</option>{usableWorldIds.map((id) => <option key={id}>{id}</option>)}
                </select>
                <span className="relation-arrow" aria-hidden="true">→</span>
                <select disabled={!canEditEdges} aria-label="Edge target world" value={edge.to} onFocus={saveHistoryPoint} onChange={(event) => setEdges((current) => current.map((item) => item.key === edge.key ? { ...item, to: event.target.value } : item))}>
                  <option value="">—</option>{usableWorldIds.map((id) => <option key={id}>{id}</option>)}
                </select>
                <button type="button" className="remove-button" disabled={!canEditEdges} onClick={() => deleteEdge(edge.key)} aria-label="Delete edge">×</button>
              </div>
            ))}
          </div>
          {effectiveEdges.length > edges.length && (
            <p className="derived-summary">+ {effectiveEdges.length - edges.length} edges derived from frame properties</p>
          )}
          <button type="button" className="secondary-button" onClick={addEdge} disabled={worlds.length === 0 || !canEditEdges}>+ Add edge</button>
        </div>

        <div className="panel verify-panel">
          <div className="panel-heading">
            <span className="step">05</span>
            <div><h2>Verification</h2><p>Test the active objective</p></div>
          </div>
          <div className="objective-summary">
            <span>Active target</span>
            <strong>{evaluationScope === 'pointed' ? 'Pointed model' : evaluationScope === 'model' ? 'Model-global truth' : evaluationScope === 'frame' ? 'Frame validity' : 'Formula–relation correspondence'}</strong>
            <small>{evaluationScope === 'pointed' ? 'One world · current valuation' : evaluationScope === 'model' ? 'Every world · current valuation' : evaluationScope === 'frame' ? 'Every world · every valuation' : 'Frame validity ↔ relational property'}</small>
          </div>
          <label className="field">
            <span>Evaluation world</span>
            <select disabled={evaluationScope !== 'pointed' || !canEditEvaluation} value={evaluationWorld} onChange={(event) => { setEvaluationWorld(event.target.value); setResult(null) }}>
              <option value="">Select a world</option>{usableWorldIds.map((id) => <option key={id}>{id}</option>)}
            </select>
          </label>
          <button type="button" className="verify-button" onClick={verify}>Verify objective</button>
          <div className={`result ${result?.kind ?? ''}`} aria-live="polite">
            <strong>{result?.message ?? 'The verification result will appear here.'}</strong>
            {result && 'detail' in result && !result.verdict && <span>{result.detail}</span>}
            {result && 'verdict' in result && result.verdict && (
              <div className="verdict-sections">
                {[result.verdict.formula, result.verdict.relation, result.verdict.correspondence].filter(Boolean).map((section) => section && (
                  <div className={`verdict-section ${section.holds ? 'pass' : 'fail'}`} key={section.label}>
                    <div><span>{section.label}</span><b>{section.holds ? 'Pass' : 'Fail'}</b></div>
                    <strong>{section.summary}</strong>
                    <small>{section.detail}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>}

      {showFrameRules && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setShowFrameRules(false)}>
          <section className="help-dialog frame-rules-dialog" role="dialog" aria-modal="true" aria-labelledby="frame-rules-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-heading">
              <div><p className="eyebrow">Accessibility relation</p><h2 id="frame-rules-title">Frame constraints</h2></div>
              <button type="button" className="dialog-close" onClick={() => setShowFrameRules(false)} aria-label="Close frame rules">×</button>
            </div>
            <p className="dialog-intro">Constraints are input conditions, separate from the active objective. <strong>Validate</strong> requires a property without changing the relation. <strong>Enforce</strong> computes the least closure and displays generated edges as dashed lines.</p>
            <div className="frame-rule-grid">
              {([
                ['reflexive', 'Reflexive', 'wRw for every world', true],
                ['symmetric', 'Symmetric', 'wRv implies vRw', true],
                ['transitive', 'Transitive', 'wRv and vRu imply wRu', true],
                ['euclidean', 'Euclidean', 'wRv and wRu imply vRu', true],
                ['serial', 'Serial', 'Every world has a successor', false],
                ['irreflexive', 'Irreflexive', 'No world accesses itself', false],
                ['acyclic', 'Acyclic', 'The relation has no directed cycle', false],
              ] as const).map(([property, name, description, canEnforce]) => {
                const status = frameRuleResults.find((result) => result.property === property)
                return (
                  <div className="frame-rule-card" key={property}>
                    <div><strong>{name}</strong><span>{description}</span></div>
                    <select
                      disabled={!canEditConstraints}
                      aria-label={`${name} rule mode`}
                      value={frameRules[property]}
                      onChange={(event) => {
                        saveHistoryPoint()
                        setFrameRules((current) => ({ ...current, [property]: event.target.value as FrameRuleMode }))
                        setResult(null)
                      }}
                    >
                      <option value="off">Off</option>
                      <option value="validate">Validate</option>
                      {canEnforce && <option value="enforce">Enforce</option>}
                    </select>
                    {status && <span className={`rule-status ${status.holds ? 'pass' : 'fail'}`}>{status.holds ? 'Pass' : status.violations[0]}</span>}
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      )}

      {showHelp && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setShowHelp(false)}>
          <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-heading">
              <div><p className="eyebrow">Reference</p><h2 id="help-title">Guide</h2></div>
              <button type="button" className="dialog-close" onClick={() => setShowHelp(false)} aria-label="Close guide">×</button>
            </div>
            <div className="guide-tabs" role="tablist" aria-label="Guide sections">
              <button type="button" role="tab" aria-selected={guideTab === 'theory'} className={guideTab === 'theory' ? 'active' : ''} onClick={() => setGuideTab('theory')}>Modal logic</button>
              <button type="button" role="tab" aria-selected={guideTab === 'controls'} className={guideTab === 'controls' ? 'active' : ''} onClick={() => setGuideTab('controls')}>Controls</button>
              <button type="button" role="tab" aria-selected={guideTab === 'objectives'} className={guideTab === 'objectives' ? 'active' : ''} onClick={() => setGuideTab('objectives')}>Objectives & constraints</button>
            </div>
            {guideTab === 'theory' && <div className="introduction-grid">
              <article><span>01</span><div><h3>Frames</h3><p>A Kripke frame is <strong>F = ⟨W,R⟩</strong>, with non-empty W and <strong>R ⊆ W × W</strong>. We write wRv when v is accessible from w.</p></div></article>
              <article><span>02</span><div><h3>Valuation and model</h3><p>A valuation is <strong>ν: Prop → ℘(W)</strong>, and <strong>M = ⟨W,R,ν⟩</strong>. Thus M,w ⊨ p exactly when w ∈ ν(p).</p></div></article>
              <article><span>03</span><div><h3>Satisfaction</h3><p><strong>M,w ⊨ φ</strong> means φ is true at w in M. Boolean connectives retain their classical clauses.</p></div></article>
              <article><span>04</span><div><h3>Necessity</h3><p><strong>M,w ⊨ □φ</strong> iff every v with wRv satisfies φ. With no successors, □φ is vacuously true.</p></div></article>
              <article><span>05</span><div><h3>Possibility</h3><p><strong>M,w ⊨ ◇φ</strong> iff some v with wRv satisfies φ. With no successors, ◇φ is false.</p></div></article>
              <article><span>06</span><div><h3>Global and frame validity</h3><p><strong>M ⊨ φ</strong> quantifies over worlds under ν. <strong>F ⊨ φ</strong> additionally quantifies over every valuation ν.</p></div></article>
            </div>}
            {guideTab === 'controls' && <div className="help-grid">
              <div><h3>Build the model</h3><p>Drag worlds to move them. Drag between handles to create an accessibility edge. Click a world to make it the evaluation world.</p></div>
              <div><h3>Editor modes</h3><p>Edit mode unlocks construction tools. Evaluate mode locks the graph against accidental changes and keeps verification close at hand.</p></div>
              <div><h3>Edit and delete</h3><p>Edit names and valuations in the side panel. Double-click an explicit edge, or select it and use the delete button.</p></div>
              <div><h3>Legend</h3><p><span className="legend-swatch petrol" /> Evaluation world<br /><span className="legend-line" /> Explicit edge<br /><span className="legend-line derived" /> Edge derived from frame properties<br /><span className="legend-reflexive">↻</span> Reflexive relation wRw</p></div>
              <div><h3>Verification scopes</h3><p>Check one world, every world under the current valuation, or frame validity across every valuation of the formula's atoms.</p></div>
              <div><h3>Formal notation</h3><p>A frame is F = ⟨W,R⟩ and a model is M = ⟨W,R,ν⟩. We write M,w ⊨ φ for truth at a world; ⊨ is used consistently throughout the game.</p></div>
              <div><h3>Frame constraints</h3><p>Validate requires a property without editing the relation. Enforce computes reflexive, symmetric, transitive, or Euclidean closure. Constraints remain separate from the formula objective.</p></div>
              <div><h3>Correspondence lab</h3><p>Load standard T, D, B, 4, and 5 axiom presets to compare finite-frame validity with their characteristic relational properties.</p></div>
              <div><h3>Formula notation</h3><p>Use ¬, ∧, ∨, →, □, ◇ or the alternatives !, &amp;, |, -&gt;, box, diamond.</p></div>
              <div><h3>Storage</h3><p>Your sandbox is saved only in this browser. Reset model restores the initial example.</p></div>
              <div><h3>Workspace</h3><p>Use the top-bar controls to undo or redo model edits and collapse either side of the workspace. The map toolbar can fit the graph or hide derived edges.</p></div>
            </div>}
            {guideTab === 'objectives' && <div className="help-grid objective-guide">
              <div><h3>Pointed objectives</h3><p>Make or refute M,w ⊨ φ at one selected world under the current valuation.</p></div>
              <div><h3>Model-global objectives</h3><p>Make or refute M ⊨ φ: the formula is checked at every world while ν remains fixed.</p></div>
              <div><h3>Frame objectives</h3><p>Establish or refute F ⊨ φ by checking every world under every valuation of the formula's atoms.</p></div>
              <div><h3>Correspondence objectives</h3><p>Compare frame validity with a relational property. The current finite frame is an instance check, not a general proof.</p></div>
              <div><h3>Size constraints</h3><p>Levels may impose exact, minimum, or maximum numbers of worlds and explicit edges.</p></div>
              <div><h3>Structural constraints</h3><p>Specific edges may be required or forbidden. Relations may also be required to satisfy or violate standard frame properties.</p></div>
              <div><h3>Valuation constraints</h3><p>An atom may be required to be true or false at a named world while other valuation choices remain editable.</p></div>
              <div><h3>Locked inputs</h3><p>A level can lock formulas, worlds, valuations, relations, the evaluation world, or the Constraints controls.</p></div>
              <div><h3>Campaign families</h3><p>Current campaigns cover local models and countermodels, global model building, frame validity, countervaluations, and correspondence.</p></div>
              <div><h3>Optimization</h3><p>Maximum-size constraints create bounded or minimal constructions without changing modal semantics.</p></div>
            </div>}
          </section>
        </div>
      )}
    </main>
  )
}
