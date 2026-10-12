'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createMechanic, deleteMechanic, updateMechanic, type MechanicActionState } from './actions'

type MechanicRow = {
  id: number
  name: string
  specialization: string | null
  phone: string | null
  isActive: boolean | null
  _count: { bookings: number; services: number }
}

function MechanicFields({ mechanic }: { mechanic?: MechanicRow }) {
  return (
    <>
      {mechanic && <input type="hidden" name="mechanicId" value={mechanic.id} />}
      <label>Name<input name="name" required maxLength={100} defaultValue={mechanic?.name ?? ''} /></label>
      <label>Specialization<input name="specialization" maxLength={100} defaultValue={mechanic?.specialization ?? ''} /></label>
      <label>Phone<input name="phone" maxLength={20} defaultValue={mechanic?.phone ?? ''} /></label>
      <label>Active status
        <select name="isActive" defaultValue={mechanic?.isActive === false ? 'false' : 'true'}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </label>
    </>
  )
}

function AddMechanicForm({ onSaved }: { onSaved: () => void }) {
  const [state, setState] = useState<MechanicActionState | null>(null)
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    try {
      const result = await createMechanic(new FormData(event.currentTarget))
      setState(result)
      if (result.success) onSaved()
    } catch {
      setState({ success: false, error: 'Mechanic could not be added. Please try again.' })
    } finally {
      setPending(false)
    }
  }
  return (
    <form onSubmit={submit} className="booking-form">
      <h2>Add mechanic</h2>
      <MechanicFields />
      {state && <p role={state.success ? 'status' : 'alert'}>{state.success ? state.message : state.error}</p>}
      <button type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add mechanic'}</button>
    </form>
  )
}

function EditMechanicForm({ mechanic, onSaved }: { mechanic: MechanicRow; onSaved: () => void }) {
  const [state, setState] = useState<MechanicActionState | null>(null)
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    try {
      const result = await updateMechanic(new FormData(event.currentTarget))
      setState(result)
      if (result.success) onSaved()
    } catch {
      setState({ success: false, error: 'Mechanic could not be updated. Please try again.' })
    } finally {
      setPending(false)
    }
  }
  return (
    <form onSubmit={submit} className="booking-form" style={{ marginTop: '1rem' }}>
      <MechanicFields mechanic={mechanic} />
      {state && <p role={state.success ? 'status' : 'alert'}>{state.success ? state.message : state.error}</p>}
      <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</button>
    </form>
  )
}

function DeleteMechanicForm({ mechanicId, onSaved }: { mechanicId: number; onSaved: () => void }) {
  const [state, setState] = useState<MechanicActionState | null>(null)
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !window.confirm('Remove this mechanic? Mechanics with booking or service history will be deactivated to preserve those records.')) return
    setPending(true)
    try {
      const result = await deleteMechanic(new FormData(event.currentTarget))
      setState(result)
      if (result.success) onSaved()
    } catch {
      setState({ success: false, error: 'Mechanic could not be removed. Please try again.' })
    } finally {
      setPending(false)
    }
  }
  return (
    <form onSubmit={submit}>
      <input type="hidden" name="mechanicId" value={mechanicId} />
      <button type="submit" disabled={pending}>{pending ? 'Removing…' : 'Delete / deactivate'}</button>
      {state && <p role={state.success ? 'status' : 'alert'}>{state.success ? state.message : state.error}</p>}
    </form>
  )
}

export function MechanicManagementForms({ mechanics }: { mechanics: MechanicRow[] }) {
  const router = useRouter()
  const refresh = () => router.refresh()
  return (
    <>
      <AddMechanicForm onSaved={refresh} />
      <h2 style={{ marginTop: '2rem' }}>Current mechanics</h2>
      {mechanics.length === 0 ? (
        <p style={{ color: '#cbd5e1' }}>No mechanics have been added yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {mechanics.map((mechanic) => (
            <article key={mechanic.id} style={{ padding: '1rem', border: '1px solid #334155', borderRadius: '0.75rem' }}>
              <h3>{mechanic.name}</h3>
              <p>{mechanic.specialization || 'No specialization'} · {mechanic.phone || 'No phone'} · {mechanic.isActive ? 'Active' : 'Inactive'}</p>
              <p>Booking links: {mechanic._count.bookings}; service records: {mechanic._count.services}</p>
              <EditMechanicForm mechanic={mechanic} onSaved={refresh} />
              <DeleteMechanicForm mechanicId={mechanic.id} onSaved={refresh} />
            </article>
          ))}
        </div>
      )}
    </>
  )
}
