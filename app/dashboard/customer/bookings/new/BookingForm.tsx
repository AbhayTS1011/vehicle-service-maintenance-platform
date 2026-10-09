'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createBooking } from '../actions'
import type { BookingResult } from '@/lib/booking/booking-service'

function SubmitButton() {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending}>{pending ? 'Submitting…' : 'Create booking'}</button>
}

export default function BookingForm({
  vehicles,
  serviceTypes,
}: {
  vehicles: Array<{ id: number; make: string; model: string; year: number; licensePlate: string }>
  serviceTypes: Array<{ id: number; name: string; description: string | null }>
}) {
  const [state, formAction] = useActionState<BookingResult | null, FormData>(createBooking, null)

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
        <select name="serviceTypeId" required defaultValue="">
          <option value="" disabled>Select a service</option>
          {serviceTypes.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}{service.description ? ` — ${service.description}` : ''}
            </option>
          ))}
        </select>
      </label>
      <label>
        Preferred date and time
        <input name="scheduledDate" type="datetime-local" required />
      </label>
      <label>
        Notes (optional)
        <textarea name="notes" rows={4} maxLength={5000} placeholder="Tell us anything helpful about the service." />
      </label>
      {state && (
        <p role="status" aria-live="polite" className={state.success ? 'booking-success' : 'booking-error'}>
          {state.success ? 'Booking request submitted. Its status is pending.' : state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  )
}
