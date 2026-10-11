'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { rejectBooking } from './actions'

export function RejectBookingForm({ bookingId }: { bookingId: number }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !window.confirm('Reject this pending booking?')) return

    setPending(true)
    setError(null)
    try {
      const result = await rejectBooking(new FormData(event.currentTarget))
      if (result.success) {
        setSuccess(true)
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch {
      setError('The booking could not be rejected. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      {success ? (
        <p role="status">Booking rejected.</p>
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
              padding: '0.5rem 0.75rem',
              cursor: pending ? 'not-allowed' : 'pointer',
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? 'Rejecting…' : 'Reject booking'}
          </button>
        </form>
      )}
      {error && <p role="alert" style={{ marginTop: '0.5rem' }}>{error}</p>}
    </div>
  )
}
