'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { completeService } from '../actions'

export function CompleteServiceForm({ bookingId }: { bookingId: number }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !window.confirm('Mark this in-progress booking as completed?')) return
    setPending(true)
    setError(null)
    try {
      const result = await completeService(new FormData(event.currentTarget))
      if (result.success) {
        setSuccess(true)
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch {
      setError('Service could not be completed. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      {success ? (
        <p role="status">Service completed.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="bookingId" value={bookingId} />
          <button type="submit" disabled={pending}>
            {pending ? 'Completing…' : 'Complete Service'}
          </button>
        </form>
      )}
      {error && <p role="alert" style={{ marginTop: '0.5rem' }}>{error}</p>}
    </div>
  )
}
