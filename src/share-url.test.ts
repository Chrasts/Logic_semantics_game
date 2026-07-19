import { describe, expect, it } from 'vitest'
import { createShareUrl, readSharedJson } from './share-url'

describe('share URLs', () => {
  it('round-trips Unicode JSON without sending it as a query parameter', () => {
    const json = JSON.stringify({ formula: '□p → ◇q', title: 'Možný svět' })
    const url = createShareUrl(json, { href: 'https://example.test/game?mode=play' } as Location)
    expect(new URL(url).search).toBe('?mode=play')
    expect(readSharedJson({ hash: new URL(url).hash } as Location)).toBe(json)
  })

  it('returns null without a share fragment and rejects malformed data', () => {
    expect(readSharedJson({ hash: '#guide' } as Location)).toBeNull()
    expect(() => readSharedJson({ hash: '#share=***' } as Location)).toThrow(/malformed/i)
  })
})
