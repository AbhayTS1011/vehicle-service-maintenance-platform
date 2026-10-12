'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { saveSchedulingSettings, type ScheduleSettingsResult } from './schedule-actions'

const days = [
  { index: 0, name: 'Sunday' },
  { index: 1, name: 'Monday' },
  { index: 2, name: 'Tuesday' },
  { index: 3, name: 'Wednesday' },
  { index: 4, name: 'Thursday' },
  { index: 5, name: 'Friday' },
  { index: 6, name: 'Saturday' },
]

function SaveButton() {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save schedule'}</button>
}

export function ScheduleSettingsForm({
  timeZone,
  weeklyHours,
}: {
  timeZone: string | null
  weeklyHours: Array<{ dayOfWeek: number; opensAt: string; closesAt: string }>
}) {
  const [state, formAction] = useActionState<ScheduleSettingsResult | null, FormData>(saveSchedulingSettings, null)
  return (
    <form action={formAction} className="booking-form">
      <label>
        Service-center timezone (IANA)
        <input name="timeZone" required defaultValue={timeZone ?? ''} placeholder="Asia/Kolkata" />
      </label>
      <p>Times use this timezone. Closed days have no bookable appointments.</p>
      {days.map(({ index, name }) => {
        const hours = weeklyHours.find((item) => item.dayOfWeek === index)
        return (
          <fieldset key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
            <legend>{name}</legend>
            <label>
              Open
              <input type="time" name={`opens-${index}`} defaultValue={hours?.opensAt ?? ''} />
            </label>
            <label>
              Close
              <input type="time" name={`closes-${index}`} defaultValue={hours?.closesAt ?? ''} />
            </label>
            <label>
              Closed
              <input type="checkbox" name={`closed-${index}`} defaultChecked={!hours} />
            </label>
          </fieldset>
        )
      })}
      {state && (
        <p role={state.success ? 'status' : 'alert'}>
          {state.success ? 'Scheduling settings saved.' : state.error}
        </p>
      )}
      <SaveButton />
    </form>
  )
}
