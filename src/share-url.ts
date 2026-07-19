const SHARE_KEY = 'share'
export const MAXIMUM_SHARE_PAYLOAD_LENGTH = 60_000

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/gu, '')
}

const base64ToBytes = (value: string) => {
  const normalized = value.replace(/-/gu, '+').replace(/_/gu, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export function createShareUrl(json: string, location: Pick<Location, 'href'> = window.location): string {
  const encoded = bytesToBase64(new TextEncoder().encode(json))
  if (encoded.length > MAXIMUM_SHARE_PAYLOAD_LENGTH) throw new Error('This package is too large for a reliable share URL. Download the JSON file instead.')
  const url = new URL(location.href)
  url.hash = `${SHARE_KEY}=${encoded}`
  return url.toString()
}

export function readSharedJson(location: Pick<Location, 'hash'> = window.location): string | null {
  const fragment = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash
  const encoded = new URLSearchParams(fragment).get(SHARE_KEY)
  if (!encoded) return null
  if (encoded.length > MAXIMUM_SHARE_PAYLOAD_LENGTH) throw new Error('The shared payload exceeds the supported URL size.')
  try {
    return new TextDecoder().decode(base64ToBytes(encoded))
  } catch {
    throw new Error('The shared URL payload is malformed.')
  }
}
