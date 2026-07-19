import {
  CUSTOM_LEVEL_FORMAT,
  CUSTOM_LEVEL_VERSION,
  parseCustomLevelPackage,
  type CustomLevelFile,
  type ParsedCustomLevelFile,
} from './level-format'

export const CUSTOM_CAMPAIGN_FORMAT = 'logic-model-builder-campaign'
export const CUSTOM_CAMPAIGN_VERSION = 1

export interface CustomCampaignPackage {
  readonly format: typeof CUSTOM_CAMPAIGN_FORMAT
  readonly version: typeof CUSTOM_CAMPAIGN_VERSION
  readonly title: string
  readonly description: string
  readonly missions: readonly CustomLevelFile[]
}

export interface ParsedCustomCampaign {
  readonly title: string
  readonly description: string
  readonly missions: readonly ParsedCustomLevelFile[]
}

export function serializeCustomCampaign(title: string, description: string, missions: readonly ParsedCustomLevelFile[]): string {
  const normalizedTitle = title.trim()
  if (!normalizedTitle) throw new Error('A custom campaign needs a title.')
  if (missions.length === 0) throw new Error('Add at least one mission to the custom campaign.')
  const file: CustomCampaignPackage = {
    format: CUSTOM_CAMPAIGN_FORMAT,
    version: CUSTOM_CAMPAIGN_VERSION,
    title: normalizedTitle,
    description: description.trim(),
    missions: missions.map(({ level, referenceSolution }) => ({
      format: CUSTOM_LEVEL_FORMAT,
      version: CUSTOM_LEVEL_VERSION,
      level,
      referenceSolution,
    })),
  }
  return JSON.stringify(file, null, 2)
}

export function parseCustomCampaign(value: unknown): ParsedCustomCampaign {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid custom campaign file.')
  const file = value as Record<string, unknown>
  if (file.format !== CUSTOM_CAMPAIGN_FORMAT || file.version !== CUSTOM_CAMPAIGN_VERSION) throw new Error('Unsupported custom campaign format or version.')
  if (typeof file.title !== 'string' || !file.title.trim()) throw new Error('A custom campaign needs a title.')
  if (typeof file.description !== 'string') throw new Error('Invalid custom campaign description.')
  if (!Array.isArray(file.missions) || file.missions.length === 0) throw new Error('A custom campaign needs at least one mission.')
  const missions = file.missions.map(parseCustomLevelPackage)
  const ids = missions.map(({ level }) => level.id)
  if (new Set(ids).size !== ids.length) throw new Error('Mission ids in a custom campaign must be unique.')
  return { title: file.title.trim(), description: file.description.trim(), missions }
}
