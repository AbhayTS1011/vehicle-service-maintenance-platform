'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { startService } from '../actions'

export function StartServiceForm({ bookingId }: { bookingId: number }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [emailWarning, setEmailWarning] = useState<string | undefined>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !window.confirm('Start service for this confirmed booking?')) return

    setPending(true)
    setError(null)
    try {
      const result = await startService(new FormData(event.currentTarget))
      if (result.success) {
        setEmailWarning(result.emailWarning)
        setSuccess(true)
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch {
      setError('Service could not be started. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      {success ? (
        <div role="status">Service started.{emailWarning && <p>{emailWarning}</p>}</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="bookingId" value={bookingId} />
          <button
            type="submit"
            disabled={pending}
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 0,
              borderRadius: '0.5rem',
              padding: '0.5rem 0.75rem',
              cursor: pending ? 'not-allowed' : 'pointer',
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? 'Starting…' : 'Start Service'}
          </button>
        </form>
      )}
      {error && <p role="alert" style={{ marginTop: '0.5rem' }}>{error}</p>}
    </div>
  )
}
