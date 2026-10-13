'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { submitBookingReview } from '../actions'

export function ReviewForm({ bookingId }: { bookingId: number }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const result = await submitBookingReview(new FormData(event.currentTarget))
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch {
      setError('Your review could not be submitted. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <div>
        <label htmlFor="review-rating" style={{ display: 'block', marginBottom: '0.4rem' }}>Rating</label>
        <select id="review-rating" name="rating" required defaultValue="5" disabled={pending}>
          <option value="5">5 — Excellent</option>
          <option value="4">4 — Very good</option>
          <option value="3">3 — Good</option>
          <option value="2">2 — Fair</option>
          <option value="1">1 — Poor</option>
        </select>
      </div>
      <div>
        <label htmlFor="review-comment" style={{ display: 'block', marginBottom: '0.4rem' }}>Comment (optional)</label>
        <textarea id="review-comment" name="comment" rows={4} disabled={pending} style={{ width: '100%', maxWidth: '36rem' }} />
      </div>
      <div>
        <button type="submit" disabled={pending} style={{
          backgroundColor: '#2563eb', color: '#fff', border: 0, borderRadius: '0.5rem',
          padding: '0.75rem 1rem', cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.7 : 1,
        }}>
          {pending ? 'Submitting…' : 'Submit review'}
        </button>
        {error && <p role="alert" style={{ marginTop: '0.75rem' }}>{error}</p>}
      </div>
    </form>
  )
}
