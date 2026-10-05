// =====================================================================
// Edit Vehicle Page - Vehicle Service Platform
// =====================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { db } from '@/lib/db'

export default function EditVehiclePage() {
  const { id } = useParams()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      registrationNumber: '',
      make: '',
      model: '',
      year: '',
      mileage: ''
    }
  })

  const onSubmit = async (data: any) => {
    // Update vehicle in database
    const updatedVehicle = await db.vehicle.updateVehicle({
      where: { id: Number(id) },
      data: {
        registrationNumber: data.registrationNumber,
        make: data.make,
        model: data.model,
        year: Number(data.year),
        mileage: Number(data.mileage)
      }
    })

    if (updatedVehicle) {
      router.push('/dashboard/vehicles')
    }
  }

  return (
    <main className="main-hero" style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: '#60a5fa' }}>Edit Vehicle</h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
              Registration Number*
            </label>
            <input
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a',
                border: '1px solid #334155', color: 'white'
              }}
              {...register('registrationNumber', { required: 'Registration number required' })}
              required
            />
            {errors.registrationNumber && <p style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.registrationNumber.message}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
              Make*
            </label>
            <input
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white' }}
              {...register('make', { required: 'Make required' })}
              required
            />
            {errors.make && <p style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.make.message}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
              Model*
            </label>
            <input
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white' }}
              {...register('model', { required: 'Model required' })}
              required
            />
            {errors.model && <p style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.model.message}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
              Year*
            </label>
            <input
              type="number"
              {...register('year', { required: 'Year required', min: 1900, max: 2100 })}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white' }}
              min="1900"
              max="2100"
              required
            />
            {errors.year && <p style={{ color: '#ef4444', fontSize: '0.75rem' }}>{errors.year.message}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
              Current Mileage (Optional)
            </label>
            <input
              type="number"
              {...register('mileage', { min: 0 })}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white' }}
              min="0"
              placeholder="0"
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#2563eb', color: 'white',
              fontWeight: '600', border: 'none', cursor: 'pointer'
            }}
          >
            Update Vehicle
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link href="/dashboard/vehicles" style={{ color: '#60a5fa', textDecoration: 'underline', fontSize: '0.875rem' }}>
            Cancel - Go to Vehicles
          </Link>
        </div>
      </div>
    </main>
  )
}