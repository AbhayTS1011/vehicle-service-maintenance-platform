'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateServiceCenter, type ServiceCenterActionState } from './actions'

function SaveButton() {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save service-center details'}</button>
}

export function ServiceCenterForm({ center }: {
  center: { name: string; address: string; phone: string; email: string; operatingHours: string | null }
}) {
  const [state, action] = useActionState<ServiceCenterActionState | null, FormData>(updateServiceCenter, null)
  return (
    <form action={action} className="booking-form">
      <label>Service-center name<input name="name" required maxLength={100} defaultValue={center.name} /></label>
      <label>Address<textarea name="address" required maxLength={2000} defaultValue={center.address} rows={3} /></label>
      <label>Phone<input name="phone" required maxLength={20} autoComplete="tel" defaultValue={center.phone} /></label>
      <label>Email<input name="email" required maxLength={255} type="email" autoComplete="email" defaultValue={center.email} /></label>
      <label>Operating hours<input name="operatingHours" maxLength={100} defaultValue={center.operatingHours ?? ''} /></label>
      <p>Timezone and structured appointment hours are managed separately in schedule settings.</p>
      {state && <p role={state.success ? 'status' : 'alert'}>{state.success ? state.message : state.error}</p>}
      <SaveButton />
    </form>
  )
}
