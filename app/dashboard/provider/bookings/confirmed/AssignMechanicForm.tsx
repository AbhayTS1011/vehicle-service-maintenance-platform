'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { assignMechanic } from '../actions'

type MechanicOption = { id: number; name: string; specialization: string | null }

export function AssignMechanicForm({ bookingId, mechanics }: { bookingId: number; mechanics: MechanicOption[] }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    setPending(true)
    setError(null)
    try {
      const result = await assignMechanic(new FormData(event.currentTarget))
      if (result.success) router.refresh()
      else setError(result.error)
    } catch {
      setError('The mechanic could not be assigned. Please try again.')
    } finally {
      setPending(false)
    }
  }

  if (mechanics.length === 0) {
    return <p style={{ color: '#94a3b8' }}>No active mechanics at this service center.</p>
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <label>
        <span className="sr-only">Mechanic for booking #{bookingId}</span>
        <select name="mechanicId" required defaultValue="" disabled={pending}>
          <option value="" disabled>Choose mechanic</option>
          {mechanics.map((mechanic) => (
            <option key={mechanic.id} value={mechanic.id}>
              {mechanic.name}{mechanic.specialization ? ` — ${mechanic.specialization}` : ''}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} style={{ marginLeft: '0.5rem' }}>
        {pending ? 'Assigning…' : 'Assign mechanic'}
      </button>
      {error && <p role="alert" style={{ marginTop: '0.5rem' }}>{error}</p>}
    </form>
  )
}
