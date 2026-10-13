'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { issueInvoice } from './actions'

export function IssueInvoiceForm({ bookingId }: { bookingId: number }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invoiceId, setInvoiceId] = useState<number | null>(null)
  const [emailWarning, setEmailWarning] = useState<string | undefined>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !window.confirm('Generate and issue this invoice?')) return
    setPending(true)
    setError(null)
    try {
      const result = await issueInvoice(new FormData(event.currentTarget))
      if (result.success) {
        setEmailWarning(result.emailWarning)
        setInvoiceId(result.invoiceId)
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch {
      setError('Invoice could not be issued. Please try again.')
    } finally {
      setPending(false)
    }
  }

  if (invoiceId !== null) return <div><Link href={`/dashboard/invoices/${invoiceId}`}>View issued invoice</Link>{emailWarning && <p role="status">{emailWarning}</p>}</div>
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="bookingId" value={bookingId} />
        <button type="submit" disabled={pending}>{pending ? 'Issuing…' : 'Generate invoice'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
