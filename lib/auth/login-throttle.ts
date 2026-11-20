import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'

export const LOGIN_LIMITS = {
  windowSeconds: 15 * 60,
  accountAttempts: 5,
  ipAttempts: 30,
} as const

const DEVELOPMENT_RATE_LIMIT_SECRET = 'local-only-login-throttle-key-change-before-deployment'

export function getLoginThrottleSecret(environment: NodeJS.ProcessEnv = process.env): string {
  const configured = environment.LOGIN_RATE_LIMIT_SECRET?.trim()
  if (environment.NODE_ENV === 'production') {
    if (!configured || configured.length < 32) {
      throw new Error('LOGIN_RATE_LIMIT_SECRET must contain at least 32 characters in production.')
    }
    return configured
  }
  return configured || DEVELOPMENT_RATE_LIMIT_SECRET
}

export function normalizeLoginIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase()
}

export function trustedClientIp(headers: Headers, environment: NodeJS.ProcessEnv = process.env): string | null {
  // Vercel documents that it overwrites X-Forwarded-For. Do not trust forwarding
  // headers on local, self-hosted, or unconfigured proxy deployments.
  if (environment.NODE_ENV !== 'production' || environment.VERCEL !== '1') return null
  const forwarded = headers.get('x-forwarded-for')
  if (!forwarded || forwarded.length > 128) return null
  const candidate = forwarded.split(',')[0].trim()
  return isIP(candidate) ? candidate : null
}

export function loginThrottleKey(kind: 'account' | 'ip', identifier: string, secret = getLoginThrottleSecret()): string {
  return createHmac('sha256', secret).update(`${kind}\0${identifier}`).digest('hex')
}
