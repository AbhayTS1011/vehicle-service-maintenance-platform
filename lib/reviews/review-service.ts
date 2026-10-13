import { BookingStatus, UserRole } from '@prisma/client'

export type ReviewActor = { id: number; role: UserRole } | null

export type BookingReview = {
  id: number
  bookingId: number
  rating: number
  comment: string | null
  createdAt: Date
}

export type ReviewSubmissionResult =
  | { success: true; review: BookingReview }
  | {
      success: false
      reason: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'not_found' | 'ineligible' | 'already_reviewed' | 'error'
      error: string
    }

export type CustomerBookingReviewResult =
  | { success: true; eligible: boolean; review: BookingReview | null }
  | { success: false; reason: 'unauthenticated' | 'forbidden' | 'invalid_input' | 'not_found' | 'error'; error: string }

export type ReviewRepository = {
  createForCompletedBooking: (input: {
    bookingId: number
    customerId: number
    rating: number
    comment: string | null
  }) => Promise<{ review: BookingReview } | { reason: 'not_found' | 'ineligible' | 'already_reviewed' }>
  findForCustomerBooking: (bookingId: number, customerId: number) => Promise<{
    status: BookingStatus
    hasService: boolean
    review: BookingReview | null
  } | null>
}

function parsePositiveId(value: unknown) {
  const id = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : Number.NaN
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

function parseRating(value: unknown) {
  const rating = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^[1-5]$/.test(value)
      ? Number(value)
      : Number.NaN
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null
}

function isCustomerRole(role: UserRole) {
  return role === UserRole.CUSTOMER || role === UserRole.FLEET_MANAGER
}

function eligibleState(status: BookingStatus, hasService: boolean) {
  return hasService && (status === BookingStatus.COMPLETED || status === BookingStatus.INVOICED)
}

export async function submitCustomerReview(
  actor: ReviewActor,
  rawBookingId: unknown,
  rawRating: unknown,
  rawComment: unknown,
  repository: Pick<ReviewRepository, 'createForCompletedBooking'>,
): Promise<ReviewSubmissionResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to submit a review.' }
  }
  if (!isCustomerRole(actor.role)) {
    return { success: false, reason: 'forbidden', error: 'Only customers can submit service reviews.' }
  }
  const bookingId = parsePositiveId(rawBookingId)
  const rating = parseRating(rawRating)
  if (!bookingId || rating === null) {
    return { success: false, reason: 'invalid_input', error: 'Choose a booking and a rating from 1 to 5.' }
  }
  if (rawComment !== undefined && rawComment !== null && typeof rawComment !== 'string') {
    return { success: false, reason: 'invalid_input', error: 'Review comments must be plain text.' }
  }
  const comment = typeof rawComment === 'string' ? rawComment.trim() || null : null

  try {
    const result = await repository.createForCompletedBooking({
      bookingId,
      customerId: actor.id,
      rating,
      comment,
    })
    if ('review' in result) return { success: true, review: result.review }
    const messages = {
      not_found: 'Booking not found.',
      ineligible: 'A review is available after the service is completed.',
      already_reviewed: 'A review has already been submitted for this booking.',
    } as const
    return { success: false, reason: result.reason, error: messages[result.reason] }
  } catch {
    return { success: false, reason: 'error', error: 'Your review could not be submitted. Please try again.' }
  }
}

export async function getCustomerBookingReview(
  actor: ReviewActor,
  rawBookingId: unknown,
  repository: Pick<ReviewRepository, 'findForCustomerBooking'>,
): Promise<CustomerBookingReviewResult> {
  if (!actor || !Number.isSafeInteger(actor.id) || actor.id <= 0) {
    return { success: false, reason: 'unauthenticated', error: 'Please sign in to view this review.' }
  }
  if (!isCustomerRole(actor.role)) {
    return { success: false, reason: 'forbidden', error: 'You do not have permission to view this review.' }
  }
  const bookingId = parsePositiveId(rawBookingId)
  if (!bookingId) return { success: false, reason: 'invalid_input', error: 'Booking not found.' }

  try {
    const booking = await repository.findForCustomerBooking(bookingId, actor.id)
    if (!booking) return { success: false, reason: 'not_found', error: 'Booking not found.' }
    return {
      success: true,
      eligible: eligibleState(booking.status, booking.hasService),
      review: booking.review,
    }
  } catch {
    return { success: false, reason: 'error', error: 'Review details could not be loaded. Please try again.' }
  }
}
