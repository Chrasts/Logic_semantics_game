import { describe, expect, it } from 'vitest'
import type { GameLevel } from './campaign'
import { parseCustomCampaign, serializeCustomCampaign } from './campaign-format'

const mission = (id: string): GameLevel => ({
  id, chapter: 'Custom', title: id, concept: 'Test', instruction: 'Make p true.', formula: 'p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
  worlds: [{ id: 'w0', atoms: 'p', position: { x: 90, y: 130 } }], edges: [], editable: [],
})

describe('custom campaign packages', () => {
  it('round-trips an ordered mission sequence', () => {
    const parsed = parseCustomCampaign(JSON.parse(serializeCustomCampaign('Course set', 'Two missions', [{ level: mission('one') }, { level: mission('two') }])))
    expect(parsed.title).toBe('Course set')
    expect(parsed.missions.map(({ level }) => level.id)).toEqual(['one', 'two'])
  })

  it('rejects empty packages and duplicate mission ids', () => {
    expect(() => serializeCustomCampaign('Empty', '', [])).toThrow(/at least one/i)
    const file = JSON.parse(serializeCustomCampaign('Duplicates', '', [{ level: mission('same') }, { level: mission('other') }]))
    file.missions[1].level.id = 'same'
    expect(() => parseCustomCampaign(file)).toThrow(/unique/i)
  })
})
