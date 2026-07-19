import { describe, expect, it } from 'vitest'
import { createEducatorCsv } from './educator-export'

describe('educator CSV export', () => {
  it('exports anonymous attempt diagnostics and metrics', () => {
    const csv = createEducatorCsv('guest-123', [{
      timestamp: '2026-07-19T10:00:00.000Z', mode: 'campaign', levelId: 'level-1', title: 'Test', concept: 'Frame validity', scope: 'frame',
      success: false, failureCategory: 'frame-property', worldCount: 2, edgeCount: 1, trueAtomCount: 1, semanticChanges: 2, bonusAchieved: false,
    }])
    expect(csv).toContain('guest_id,timestamp')
    expect(csv).toContain('"guest-123"')
    expect(csv).toContain('"frame-property"')
    expect(csv).toContain('"2","1","1","2","false"')
  })

  it('quotes authored text and neutralizes spreadsheet formulas', () => {
    const csv = createEducatorCsv('guest', [{ timestamp: 'now', mode: 'custom', title: '=IMPORTXML("bad")', scope: 'pointed', success: true, worldCount: 1, edgeCount: 0 }])
    expect(csv).toContain('"\'=IMPORTXML(""bad"")"')
  })
})
