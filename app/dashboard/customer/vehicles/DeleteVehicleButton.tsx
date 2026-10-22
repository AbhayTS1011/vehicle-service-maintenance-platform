'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteVehicle } from './actions'

export default function DeleteVehicleButton({ id }: { id: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  return <>
    <button type="button" disabled={pending} onClick={() => {
      if (!window.confirm('Delete this vehicle? Vehicles with booking history cannot be deleted.')) return
      setError('')
      startTransition(async () => {
        const result = await deleteVehicle(id)
        if (!result.success) { setError(result.error); return }
        router.refresh()
      })
    }} style={{ color: '#fca5a5' }}>{pending ? 'Deleting…' : 'Delete'}</button>
    {error && <span role="alert" style={{ color: '#fca5a5' }}>{error}</span>}
  </>
}
