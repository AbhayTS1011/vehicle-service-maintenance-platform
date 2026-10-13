'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { completeService } from '../actions'

type InventoryPart = { id: number; name: string; partNumber: string; unitPrice: unknown; stockQuantity: number }

export function CompleteServiceForm({ bookingId, parts }: { bookingId: number; parts: InventoryPart[] }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [emailWarning, setEmailWarning] = useState<string | undefined>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !window.confirm('Save this service record, deduct the selected parts, and complete the booking?')) return
    setPending(true)
    setError(null)
    try {
      const result = await completeService(new FormData(event.currentTarget))
      if (result.success) {
        setEmailWarning(result.emailWarning)
        setSuccess(true)
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch {
        setError('Service record could not be saved. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      {success ? (
        <div role="status">Service record saved and booking completed.{emailWarning && <p>{emailWarning}</p>}</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="bookingId" value={bookingId} />
          <label style={{ display: 'block', margin: '0.5rem 0' }}>
            Diagnosis notes
            <textarea name="diagnosisNotes" maxLength={5000} rows={2} style={{ display: 'block', width: '100%' }} />
          </label>
          <label style={{ display: 'block', margin: '0.5rem 0' }}>
            Work performed <span aria-hidden="true">*</span>
            <textarea name="workPerformed" required maxLength={5000} rows={3} style={{ display: 'block', width: '100%' }} />
          </label>
          <label style={{ display: 'block', margin: '0.5rem 0' }}>
            Labor cost
            <input name="laborCost" type="number" min="0" max="99999999.99" step="0.01" defaultValue="0.00" required />
          </label>
          {parts.length === 0 ? (
            <p>No parts are currently in stock.</p>
          ) : (
            <fieldset style={{ margin: '0.75rem 0', padding: '0.75rem' }}>
              <legend>Parts consumed (optional, up to 5 different parts)</legend>
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', margin: '0.5rem 0', flexWrap: 'wrap' }}>
                  <label>
                    Part {index + 1}
                    <select name="partId" defaultValue="">
                      <option value="">None</option>
                      {parts.map((part) => (
                        <option key={part.id} value={part.id}>
                          {part.name} ({part.partNumber}) · {part.stockQuantity} available · ₹{String(part.unitPrice)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Quantity
                    <input name="quantity" type="number" min="1" max="100000" defaultValue="1" />
                  </label>
                </div>
              ))}
            </fieldset>
          )}
          <button type="submit" disabled={pending}>
            {pending ? 'Saving record…' : 'Save Service Record & Complete'}
          </button>
        </form>
      )}
      {error && <p role="alert" style={{ marginTop: '0.5rem' }}>{error}</p>}
    </div>
  )
}
