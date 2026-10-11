'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { confirmBooking } from './actions'

export function ConfirmBookingForm({ bookingId }: { bookingId: number }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    setPending(true)
    setError(null)
    try {
      const result = await confirmBooking(new FormData(event.currentTarget))
      if (result.success) {
        setSuccess(true)
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch {
      setError('The booking could not be confirmed. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      {success ? (
        <p role="status">Booking confirmed.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="bookingId" value={bookingId} />
          <button
            type="submit"
            disabled={pending}
            style={{
              backgroundColor: '#16a34a',
              color: '#fff',
              border: 0,
              borderRadius: '0.5rem',
              padding: '0.5rem 0.75rem',
              cursor: pending ? 'not-allowed' : 'pointer',
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? 'Confirming…' : 'Confirm booking'}
          </button>
        </form>
      )}
      {error && <p role="alert" style={{ marginTop: '0.5rem' }}>{error}</p>}
    </div>
  )
}
