'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { cancelBooking } from './actions'

export function CancelBookingForm({ bookingId }: { bookingId: number }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !window.confirm('Cancel this pending booking?')) return

    const formData = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    try {
      const result = await cancelBooking(formData)
      if (result.success) {
        setSuccess(true)
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch {
      setError('The booking could not be cancelled. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {success ? (
        <p role="status">Booking cancelled.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="bookingId" value={bookingId} />
          <button
            type="submit"
            disabled={pending}
            style={{
              backgroundColor: '#dc2626',
              color: '#fff',
              border: 0,
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              cursor: pending ? 'not-allowed' : 'pointer',
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? 'Cancelling…' : 'Cancel booking'}
          </button>
        </form>
      )}
      {error && <p role="alert" style={{ marginTop: '0.75rem' }}>{error}</p>}
    </div>
  )
}
