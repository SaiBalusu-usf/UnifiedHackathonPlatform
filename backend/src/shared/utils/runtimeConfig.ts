/** Validate operator configuration instead of passing ambiguous strings downstream. */
export function configuredPort(name: string, fallback: number): number {
  const raw = process.env[name]
  const port = raw === undefined ? fallback : Number(raw)
  if ((raw !== undefined && !/^\d+$/.test(raw)) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer TCP port between 1 and 65535`)
  }
  return port
}

export function configuredTokenLifetime(name: string, fallbackSeconds: number): number {
  const raw = process.env[name]
  if (raw === undefined) return fallbackSeconds
  const match = /^(\d+)(s|m|h|d)?$/.exec(raw)
  const multiplier: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }
  const seconds = match ? Number(match[1]) * multiplier[match[2] || 's'] : NaN
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 30 * 86400) {
    throw new Error(`${name} must be a duration between one second and 30 days`)
  }
  return seconds
}
