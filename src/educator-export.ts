export interface ExportableAttempt {
  readonly timestamp: string
  readonly mode: string
  readonly levelId?: string
  readonly title: string
  readonly concept?: string
  readonly scope: string
  readonly success: boolean
  readonly failureCategory?: string
  readonly worldCount: number
  readonly edgeCount: number
  readonly trueAtomCount?: number
  readonly semanticChanges?: number
  readonly bonusAchieved?: boolean
}

const columns = [
  'guest_id', 'timestamp', 'mode', 'level_id', 'title', 'concept', 'scope', 'success',
  'failure_category', 'worlds', 'explicit_edges', 'true_atoms', 'semantic_changes', 'bonus_achieved',
] as const

const safeCell = (value: unknown) => {
  let text = value === undefined || value === null ? '' : String(value)
  // Prevent spreadsheet applications from interpreting authored text as a formula.
  if (/^[=+\-@]/u.test(text)) text = `'${text}`
  return `"${text.replace(/"/gu, '""')}"`
}

export function createEducatorCsv(guestId: string, attempts: readonly ExportableAttempt[]): string {
  const rows = attempts.map((entry) => [
    guestId, entry.timestamp, entry.mode, entry.levelId, entry.title, entry.concept, entry.scope,
    entry.success, entry.failureCategory, entry.worldCount, entry.edgeCount, entry.trueAtomCount,
    entry.semanticChanges, entry.bonusAchieved,
  ].map(safeCell).join(','))
  return [columns.join(','), ...rows].join('\r\n')
}
