'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createVehicle, updateVehicle } from './actions'

const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white' }
type VehicleFormRecord = { id: number; make: string; model: string; year: number; licensePlate: string; vin: string | null; mileage: number | null }

export default function VehicleForm({ vehicle }: { vehicle?: VehicleFormRecord }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    startTransition(async () => {
      const result = vehicle
        ? await updateVehicle(vehicle.id, values)
        : await createVehicle(values)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.push('/dashboard/customer/vehicles')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: '1rem' }}>
      {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
      <label>Make *<input name="make" required maxLength={50} defaultValue={vehicle?.make ?? ''} style={inputStyle} /></label>
      <label>Model *<input name="model" required maxLength={50} defaultValue={vehicle?.model ?? ''} style={inputStyle} /></label>
      <label>Year *<input name="year" type="number" min={1900} max={2100} required defaultValue={vehicle?.year ?? ''} style={inputStyle} /></label>
      <label>License plate *<input name="licensePlate" required maxLength={20} defaultValue={vehicle?.licensePlate ?? ''} style={inputStyle} /></label>
      <label>VIN (optional)<input name="vin" maxLength={50} defaultValue={vehicle?.vin ?? ''} style={inputStyle} /></label>
      <label>Mileage<input name="mileage" type="number" min={0} step={1} defaultValue={vehicle?.mileage ?? 0} style={inputStyle} /></label>
      <button disabled={pending} type="submit" style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#2563eb', color: 'white', border: 0, fontWeight: 600 }}>
        {pending ? 'Saving…' : vehicle ? 'Save changes' : 'Add vehicle'}
      </button>
      <Link href={vehicle ? `/dashboard/customer/vehicles/${vehicle.id}` : '/dashboard/customer/vehicles'}>Cancel</Link>
    </form>
  )
}
