'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'
import { verifyToken } from '@/lib/auth/jwt'
import { db } from '@/lib/db'
import { issueInvoiceForCompletedBooking } from '@/lib/invoicing/invoice-service'
import { notifySuccessfulInvoiceMutation } from '@/lib/email-workflows'

export async function issueInvoice(formData: FormData) {
  const token = (await cookies()).get('apex_session')?.value
  const payload = token ? await verifyToken(token) : null
  const role = payload?.role as UserRole | undefined
  const actor = payload?.userId && role ? { id: payload.userId, role } : null
  const result = await issueInvoiceForCompletedBooking(actor, formData.get('bookingId'), db.invoice)

  if (result.success) {
    revalidatePath('/dashboard/provider/invoices')
    revalidatePath('/dashboard/customer/invoices')
    revalidatePath('/dashboard/customer/bookings')
  }
  return notifySuccessfulInvoiceMutation(result, result.success ? result.invoiceId : null, db.workflowEmail)
}
