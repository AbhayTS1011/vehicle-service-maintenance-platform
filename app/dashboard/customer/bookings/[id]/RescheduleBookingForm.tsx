'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { getAvailableSlots, updateBooking } from '../actions'
import type { CustomerBookingUpdateResult } from '@/lib/booking/booking-service'

function SaveButton() {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save booking changes'}</button>
}

export function RescheduleBookingForm({
  bookingId,
  serviceTypeId,
  scheduledDate,
  notes,
  timeZone,
}: {
  bookingId: number
  serviceTypeId: number
  scheduledDate: Date
  notes: string | null
  timeZone: string | null
}) {
  const [state, formAction] = useActionState<CustomerBookingUpdateResult | null, FormData>(updateBooking, null)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<Date[]>([])
  const [loading, setLoading] = useState(false)
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    if (!date || !timeZone) return () => { current = false }
    getAvailableSlots(date, String(serviceTypeId))
      .then((result) => {
        if (!current) return
        if (!result.success) setAvailabilityMessage(result.error)
        else if (!result.configured) setAvailabilityMessage('The service center has not configured its schedule.')
        else if (result.slots.length === 0) setAvailabilityMessage('No appointment times are available for that date.')
        else setSlots(result.slots)
      })
      .catch(() => { if (current) setAvailabilityMessage('Available appointment times could not be loaded.') })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [date, serviceTypeId, timeZone])

  return (
    <section style={{ marginTop: '1.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Edit pending booking</h2>
      <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
        You can change the appointment time and notes while this booking is pending. The vehicle, service, status, and mechanic assignment cannot be changed here.
      </p>
      <form action={formAction} className="booking-form">
        <input type="hidden" name="bookingId" value={bookingId} />
        <input type="hidden" name="expectedScheduledDate" value={scheduledDate.toISOString()} />
        <label>
          New appointment date
          <input type="date" required value={date} onChange={(event) => {
            const value = event.target.value
            setDate(value)
            setSlots([])
            setAvailabilityMessage(null)
            setLoading(Boolean(value && timeZone))
          }} />
        </label>
        <label>
          Available time {timeZone ? `(${timeZone})` : ''}
          <select name="scheduledDate" required defaultValue="" disabled={!timeZone || loading || slots.length === 0}>
            <option value="" disabled>{loading ? 'Checking availability…' : 'Select an available time'}</option>
            {slots.map((slot) => (
              <option key={slot.toISOString()} value={slot.toISOString()}>
                {new Intl.DateTimeFormat('en-IN', { timeZone: timeZone ?? 'UTC', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(slot)}
              </option>
            ))}
          </select>
        </label>
        {!timeZone && <p role="alert">Scheduling is unavailable until a timezone and weekly hours are configured.</p>}
        {availabilityMessage && <p role="status">{availabilityMessage}</p>}
        <label>
          Notes (optional)
          <textarea name="notes" rows={4} maxLength={5000} defaultValue={notes ?? ''} />
        </label>
        {state && (
          <p role={state.success ? 'status' : 'alert'}>
            {state.success ? 'Booking updated.' : state.error}
          </p>
        )}
        <SaveButton />
      </form>
    </section>
  )
}
