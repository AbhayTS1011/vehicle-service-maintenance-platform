const DEVELOPMENT_JWT_SECRET = 'super-secret-jwt-key-change-in-production-123456'

export function getJwtSecret(environment: NodeJS.ProcessEnv = process.env): string {
  const configuredSecret = environment.JWT_SECRET?.trim()

  if (environment.NODE_ENV === 'production') {
    if (!configuredSecret || configuredSecret.length < 32) {
      throw new Error('JWT_SECRET must contain at least 32 characters in production.')
    }
    return configuredSecret
  }

  return configuredSecret || DEVELOPMENT_JWT_SECRET
}
