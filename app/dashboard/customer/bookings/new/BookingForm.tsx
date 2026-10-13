'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { createBooking, getAvailableSlots } from '../actions'
import type { BookingResult } from '@/lib/booking/booking-service'

function SubmitButton() {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending}>{pending ? 'Submitting…' : 'Create booking'}</button>
}

export default function BookingForm({
  vehicles,
  serviceTypes,
  timeZone,
}: {
  vehicles: Array<{ id: number; make: string; model: string; year: number; licensePlate: string }>
  serviceTypes: Array<{ id: number; name: string; description: string | null; estimatedDurationMinutes: number }>
  timeZone: string | null
}) {
  const [state, formAction] = useActionState<(BookingResult & { emailWarning?: string }) | null, FormData>(createBooking, null)
  const [date, setDate] = useState('')
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [slots, setSlots] = useState<Date[]>([])
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    let current = true
    if (!date || !serviceTypeId || !timeZone) return () => { current = false }

    getAvailableSlots(date, serviceTypeId)
      .then((result) => {
        if (!current) return
        if (result.success) {
          setSlots(result.slots)
          if (!result.configured) setAvailabilityError('The service center has not configured scheduling hours and timezone yet.')
          else if (result.slots.length === 0) setAvailabilityError('No appointment times are available for that date and service.')
        } else {
          setAvailabilityError(result.error)
        }
      })
      .catch(() => {
        if (current) setAvailabilityError('Available appointment times could not be loaded.')
      })
      .finally(() => { if (current) setLoadingSlots(false) })

    return () => { current = false }
  }, [date, serviceTypeId, timeZone])

  if (vehicles.length === 0) {
    return <p>Add a vehicle to your account before requesting a service.</p>
  }
  if (serviceTypes.length === 0) {
    return <p>No services are available right now. Please try again later.</p>
  }

  return (
    <form action={formAction} className="booking-form">
      <label>
        Vehicle
        <select name="vehicleId" required defaultValue="">
          <option value="" disabled>Select a vehicle</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.licensePlate})
            </option>
          ))}
        </select>
      </label>
      <label>
        Service
        <select name="serviceTypeId" required value={serviceTypeId} onChange={(event) => {
          const value = event.target.value
          setServiceTypeId(value)
          setSlots([])
          setAvailabilityError(null)
          setLoadingSlots(Boolean(date && value && timeZone))
        }}>
          <option value="" disabled>Select a service</option>
          {serviceTypes.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} ({service.estimatedDurationMinutes} min){service.description ? ` — ${service.description}` : ''}
            </option>
          ))}
        </select>
      </label>
      <label>
        Preferred date
        <input name="appointmentDate" type="date" required value={date} onChange={(event) => {
          const value = event.target.value
          setDate(value)
          setSlots([])
          setAvailabilityError(null)
          setLoadingSlots(Boolean(value && serviceTypeId && timeZone))
        }} />
      </label>
      <label>
        Available appointment time {timeZone ? `(${timeZone})` : ''}
        <select name="scheduledDate" required defaultValue="" disabled={!timeZone || loadingSlots || slots.length === 0}>
          <option value="" disabled>{loadingSlots ? 'Checking availability…' : 'Select an available time'}</option>
          {slots.map((slot) => (
            <option key={slot.toISOString()} value={slot.toISOString()}>
              {new Intl.DateTimeFormat('en-IN', { timeZone: timeZone ?? 'UTC', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(slot)}
            </option>
          ))}
        </select>
      </label>
      {!timeZone && <p role="alert">Appointments are unavailable until the service center configures its timezone and weekly hours.</p>}
      {availabilityError && <p role="status">{availabilityError}</p>}
      <label>
        Notes (optional)
        <textarea name="notes" rows={4} maxLength={5000} placeholder="Tell us anything helpful about the service." />
      </label>
      {state && (
        <p role="status" aria-live="polite" className={state.success ? 'booking-success' : 'booking-error'}>
          {state.success ? <>Booking request submitted. Its status is pending.{state.emailWarning && <><br />{state.emailWarning}</>}</> : state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  )
}
