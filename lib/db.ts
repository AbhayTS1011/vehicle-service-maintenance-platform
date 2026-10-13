// =====================================================================
// Prisma persistence for booking, service-center, and mechanic workflows;
// legacy user and vehicle adapters remain placeholders pending their migration.
// =====================================================================

import { BookingStatus, PrismaClient, type Prisma } from '@prisma/client'
import type { ProviderConfirmedBookingsQuery, ProviderInProgressBookingsQuery, ProviderPendingBookingsQuery } from './booking/booking-service'
import type { ServiceCenterUpdate, MechanicWrite } from './admin/management'
import { deleteMechanicRecord } from './admin/management'
import { availableAppointmentSlots, dateInTimeZone, type ScheduledInterval, type WeeklyOpening } from './booking/scheduling'
import type { ServiceRecordRepository } from './service-records/service-record-service'
import type { InvoiceRepository } from './invoicing/invoice-service'
import type { ReviewRepository } from './reviews/review-service'
import type { WorkflowEmailRepository } from './email-workflows'
import type { AdminDashboardRepository } from './admin/dashboard'

const prisma = new PrismaClient()

/** Disconnect the shared Prisma client after process-level integration tests. */
export async function disconnectDatabase() {
  await prisma.$disconnect()
}

type BookingTransaction = Prisma.TransactionClient

const invoiceViewSelect = {
  id: true,
  bookingId: true,
  invoiceNumber: true,
  subtotal: true,
  tax: true,
  totalAmount: true,
  status: true,
  issuedAt: true,
  dueDate: true,
  booking: {
    select: {
      id: true,
      customer: { select: { name: true, email: true } },
      vehicle: { select: { make: true, model: true, licensePlate: true } },
      serviceType: { select: { name: true } },
      service: {
        select: {
          id: true,
          diagnosisNotes: true,
          workPerformed: true,
          laborCost: true,
          completedAt: true,
          serviceParts: {
            select: {
              quantity: true,
              unitPriceAtTime: true,
              part: { select: { name: true, partNumber: true } },
            },
            orderBy: { id: 'asc' as const },
          },
        },
      },
    },
  },
} satisfies Prisma.InvoiceSelect

const bookingNotificationSelect = {
  id: true,
  status: true,
  scheduledDate: true,
  customer: { select: { name: true, email: true } },
  serviceType: { select: { name: true } },
} satisfies Prisma.BookingSelect

async function lockSchedulingCenter(transaction: BookingTransaction, serviceCenterId: number) {
  await transaction.$queryRaw<Array<{ id: number }>>`
    SELECT id FROM service_center WHERE id = ${serviceCenterId} FOR UPDATE
  `
}

async function schedulingInputs(transaction: BookingTransaction, serviceCenterId: number, date: string, omitBookingId?: number) {
  const center = await transaction.serviceCenter.findUnique({
    where: { id: serviceCenterId },
    select: { id: true, timeZone: true },
  })
  if (!center?.timeZone) return null
  const weeklyHours = await transaction.$queryRaw<WeeklyOpening[]>`
    SELECT day_of_week AS "dayOfWeek",
      to_char(opens_at, 'HH24:MI') AS "opensAt",
      to_char(closes_at, 'HH24:MI') AS "closesAt"
    FROM service_center_hours
    WHERE service_center_id = ${serviceCenterId}
    ORDER BY day_of_week, opens_at
  `
  const serviceCenterDate = new Date(`${date}T00:00:00.000Z`)
  const lowerBound = new Date(serviceCenterDate.getTime() - 24 * 60 * 60 * 1000)
  const upperBound = new Date(serviceCenterDate.getTime() + 48 * 60 * 60 * 1000)
  const existingAppointments = await transaction.$queryRaw<Array<{ start: Date; end: Date }>>`
    SELECT booking.scheduled_date AS start,
      booking.scheduled_date + make_interval(mins => service_type.estimated_duration_minutes) AS "end"
    FROM bookings AS booking
    JOIN service_types AS service_type ON service_type.id = booking.service_type_id
    WHERE booking.service_center_id = ${serviceCenterId}
      AND booking.status IN ('PENDING'::booking_status, 'CONFIRMED'::booking_status, 'IN_PROGRESS'::booking_status)
      AND booking.scheduled_date < ${upperBound}
      AND booking.scheduled_date + make_interval(mins => service_type.estimated_duration_minutes) > ${lowerBound}
      AND (${omitBookingId ?? null}::INTEGER IS NULL OR booking.id <> ${omitBookingId ?? null})
  `
  const activeMechanicCount = await transaction.mechanic.count({ where: { serviceCenterId, isActive: true } })
  return { center, weeklyHours, existingAppointments: existingAppointments as ScheduledInterval[], activeMechanicCount }
}

async function availableSlotsWithTransaction(
  transaction: BookingTransaction,
  serviceCenterId: number,
  date: string,
  durationMinutes: number,
  omitBookingId?: number,
) {
  const inputs = await schedulingInputs(transaction, serviceCenterId, date, omitBookingId)
  if (!inputs?.center.timeZone) return { configured: false as const, slots: [] as Date[] }
  return {
    configured: true as const,
    slots: availableAppointmentSlots({
      date,
      durationMinutes,
      timeZone: inputs.center.timeZone,
      weeklyHours: inputs.weeklyHours,
      activeMechanicCount: inputs.activeMechanicCount,
      existingAppointments: inputs.existingAppointments,
    }),
  }
}

export const db = {
  // Booking creation uses the SQL-first PostgreSQL database through Prisma.
  // The other legacy methods below remain placeholders until their phases are implemented.
  bookingCatalog: {
    async vehiclesForCustomer(customerId: number) {
      return prisma.vehicle.findMany({
        where: { ownerId: customerId },
        select: { id: true, make: true, model: true, year: true, licensePlate: true },
        orderBy: { id: 'asc' },
      })
    },
    async serviceTypes() {
      return prisma.serviceType.findMany({
        select: { id: true, name: true, description: true, basePrice: true, estimatedDurationMinutes: true },
        orderBy: { name: 'asc' },
      })
    },
    async ownsVehicle(customerId: number, vehicleId: number) {
      return Boolean(await prisma.vehicle.findFirst({
        where: { id: vehicleId, ownerId: customerId },
        select: { id: true },
      }))
    },
    async serviceTypeExists(serviceTypeId: number) {
      return Boolean(await prisma.serviceType.findUnique({
        where: { id: serviceTypeId },
        select: { id: true },
      }))
    },
    async serviceCenterId() {
      const center = await prisma.serviceCenter.findFirst({
        select: { id: true },
        orderBy: { id: 'asc' },
      })
      return center?.id ?? null
    },
    async schedulingSettings() {
      const center = await prisma.serviceCenter.findFirst({
        select: { id: true, name: true, timeZone: true },
        orderBy: { id: 'asc' },
      })
      if (!center) return null
      const weeklyHours = await prisma.$queryRaw<WeeklyOpening[]>`
        SELECT day_of_week AS "dayOfWeek",
          to_char(opens_at, 'HH24:MI') AS "opensAt",
          to_char(closes_at, 'HH24:MI') AS "closesAt"
        FROM service_center_hours
        WHERE service_center_id = ${center.id}
        ORDER BY day_of_week, opens_at
      `
      return { ...center, weeklyHours }
    },
    async saveSchedulingSettings(timeZone: string, weeklyHours: WeeklyOpening[]) {
      return prisma.$transaction(async (transaction) => {
        const center = await transaction.serviceCenter.findFirst({
          select: { id: true },
          orderBy: { id: 'asc' },
        })
        if (!center) return false
        await lockSchedulingCenter(transaction, center.id)
        await transaction.serviceCenter.update({ where: { id: center.id }, data: { timeZone } })
        await transaction.$executeRaw`DELETE FROM service_center_hours WHERE service_center_id = ${center.id}`
        for (const hours of weeklyHours) {
          await transaction.$executeRaw`
            INSERT INTO service_center_hours (service_center_id, day_of_week, opens_at, closes_at)
            VALUES (${center.id}, ${hours.dayOfWeek}, ${hours.opensAt}::TIME, ${hours.closesAt}::TIME)
          `
        }
        return true
      })
    },
    async availableAppointmentSlots(date: string, serviceTypeId: number) {
      const center = await prisma.serviceCenter.findFirst({ select: { id: true }, orderBy: { id: 'asc' } })
      if (!center) return { configured: false, slots: [] as Date[] }
      const serviceType = await prisma.serviceType.findUnique({
        where: { id: serviceTypeId },
        select: { estimatedDurationMinutes: true },
      })
      if (!serviceType) return { configured: true, slots: [] as Date[] }
      return prisma.$transaction(async (transaction) => {
        const result = await availableSlotsWithTransaction(
          transaction,
          center.id,
          date,
          serviceType.estimatedDurationMinutes,
        )
        return { configured: result.configured, slots: result.slots.filter((slot) => slot > new Date()) }
      })
    },
  },
  user: {
    async findUnique({ where }: { where: { id?: number; email?: string } }) {
      // In a Prisma implementation, this would query PostgreSQL
      // For now, return null to indicate need for real database
      return null
    },
    async create({ data }: { data: any }) {
      // Placeholder - will be replaced by Prisma client
      return { id: 1, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    },
  },
  vehicle: {
    async findUnique({ where }: { where: { id: number } }) {
      // Placeholder - will be replaced by Prisma client
      return null
    },
    async create({ data }: { data: any }) {
      // Placeholder - will be replaced by Prisma client
      return { id: 1, ...data, ownerId: Number(data.ownerId), createdAt: new Date().toISOString() }
    },
    async updateVehicle({ where, data }: { where: { id: number }; data: any }) {
      // Placeholder
      return { id: where.id, ...data, updatedAt: new Date().toISOString() }
    },
    async deleteVehicle({ where }: { where: { id: number } }) {
      // Placeholder
      return { id: where.id, deleted: true }
    },
  },
  serviceCenter: {
    async findUnique({ where }: { where: { id: number } }) {
      return prisma.serviceCenter.findUnique({ where })
    },
    async findCurrent() {
      return prisma.serviceCenter.findFirst({ orderBy: { id: 'asc' } })
    },
    async updateCurrent(data: ServiceCenterUpdate) {
      const current = await prisma.serviceCenter.findFirst({ select: { id: true }, orderBy: { id: 'asc' } })
      if (!current) return null
      return prisma.serviceCenter.update({
        where: { id: current.id },
        data,
      })
    },
  },
  booking: {
    async findPendingProviderBookings(query: ProviderPendingBookingsQuery) {
      return prisma.booking.findMany(query)
    },
    async findConfirmedProviderBookings(query: ProviderConfirmedBookingsQuery) {
      return prisma.booking.findMany(query)
    },
    async findInProgressProviderBookings(query: ProviderInProgressBookingsQuery) {
      return prisma.booking.findMany(query)
    },
    async findBookingAssignmentContext(bookingId: number) {
      return prisma.booking.findUnique({
        where: { id: bookingId },
        select: { status: true, mechanicId: true, serviceCenterId: true },
      })
    },
    async findMechanicForAssignment(mechanicId: number) {
      return prisma.mechanic.findUnique({
        where: { id: mechanicId },
        select: { id: true, name: true, isActive: true, serviceCenterId: true },
      })
    },
    async assignMechanicToConfirmedBooking(bookingId: number, mechanicId: number, serviceCenterId: number) {
      return prisma.$transaction(async (transaction) => {
        await lockSchedulingCenter(transaction, serviceCenterId)
        const booking = await transaction.booking.findUnique({
          where: { id: bookingId },
          select: { status: true, mechanicId: true, serviceCenterId: true, scheduledDate: true, serviceTypeId: true },
        })
        if (!booking || booking.status !== BookingStatus.CONFIRMED || booking.mechanicId !== null ||
            booking.serviceCenterId !== serviceCenterId) return 0
        const serviceType = await transaction.serviceType.findUnique({
          where: { id: booking.serviceTypeId },
          select: { estimatedDurationMinutes: true },
        })
        if (!serviceType) return 0
        const scheduledEnd = new Date(booking.scheduledDate.getTime() + serviceType.estimatedDurationMinutes * 60_000)
        const conflicts = await transaction.$queryRaw<Array<{ id: number }>>`
          SELECT other_booking.id
          FROM bookings AS other_booking
          JOIN service_types AS other_service ON other_service.id = other_booking.service_type_id
          WHERE other_booking.service_center_id = ${serviceCenterId}
            AND other_booking.mechanic_id = ${mechanicId}
            AND other_booking.id <> ${bookingId}
            AND other_booking.status IN ('PENDING'::booking_status, 'CONFIRMED'::booking_status, 'IN_PROGRESS'::booking_status)
            AND other_booking.scheduled_date < ${scheduledEnd}
            AND other_booking.scheduled_date + make_interval(mins => other_service.estimated_duration_minutes) > ${booking.scheduledDate}
          LIMIT 1
        `
        if (conflicts.length > 0) return 2
        const rows = await transaction.$queryRaw<Array<{ id: number }>>`
          UPDATE bookings AS booking
          SET mechanic_id = ${mechanicId}
          FROM mechanics AS mechanic
          WHERE booking.id = ${bookingId}
            AND booking.status = 'CONFIRMED'::booking_status
            AND booking.mechanic_id IS NULL
            AND booking.service_center_id = ${serviceCenterId}
            AND mechanic.id = ${mechanicId}
            AND mechanic.is_active IS TRUE
            AND mechanic.service_center_id = booking.service_center_id
          RETURNING booking.id
        `
        return rows.length
      })
    },
    async createScheduledBooking(data: {
      customerId: number
      vehicleId: number
      serviceTypeId: number
      serviceCenterId: number
      scheduledDate: Date
      notes?: string
    }) {
      return prisma.$transaction(async (transaction) => {
        const initialCenter = await transaction.serviceCenter.findUnique({
          where: { id: data.serviceCenterId },
          select: { id: true },
        })
        if (!initialCenter) return { created: false as const, reason: 'configuration' as const }
        await lockSchedulingCenter(transaction, initialCenter.id)
        const center = await transaction.serviceCenter.findUnique({
          where: { id: initialCenter.id },
          select: { id: true, timeZone: true },
        })
        if (!center) return { created: false as const, reason: 'configuration' as const }
        const [vehicle, serviceType] = await Promise.all([
          transaction.vehicle.findFirst({ where: { id: data.vehicleId, ownerId: data.customerId }, select: { id: true } }),
          transaction.serviceType.findUnique({ where: { id: data.serviceTypeId }, select: { estimatedDurationMinutes: true } }),
        ])
        if (!vehicle || !serviceType) return { created: false as const, reason: 'invalid' as const }
        if (!center.timeZone) return { created: false as const, reason: 'configuration' as const }
        const date = dateInTimeZone(data.scheduledDate, center.timeZone)
        const availability = await availableSlotsWithTransaction(
          transaction,
          center.id,
          date,
          serviceType.estimatedDurationMinutes,
        )
        if (!availability.configured) return { created: false as const, reason: 'configuration' as const }
        if (!availability.slots.some((slot) => slot.getTime() === data.scheduledDate.getTime()) || data.scheduledDate <= new Date()) {
          return { created: false as const, reason: 'unavailable' as const }
        }
        const booking = await transaction.booking.create({
          data: {
            customerId: data.customerId,
            vehicleId: data.vehicleId,
            serviceTypeId: data.serviceTypeId,
            serviceCenterId: center.id,
            scheduledDate: data.scheduledDate,
            notes: data.notes,
            status: BookingStatus.PENDING,
          },
        })
        return { created: true as const, bookingId: booking.id }
      })
    },
    async reschedulePendingForCustomer(
      bookingId: number,
      customerId: number,
      expectedScheduledDate: Date,
      scheduledDate: Date,
      notes: string | null,
    ) {
      return prisma.$transaction(async (transaction) => {
        const initialBooking = await transaction.booking.findFirst({
          where: { id: bookingId, customerId },
          select: { serviceCenterId: true },
        })
        if (!initialBooking) return { updated: false as const, reason: 'not_found' as const }
        await lockSchedulingCenter(transaction, initialBooking.serviceCenterId)
        const booking = await transaction.booking.findFirst({
          where: { id: bookingId, customerId },
          select: { status: true, serviceCenterId: true, serviceTypeId: true, scheduledDate: true },
        })
        if (!booking) return { updated: false as const, reason: 'not_found' as const }
        if (booking.status !== BookingStatus.PENDING) return { updated: false as const, reason: 'invalid_state' as const }
        if (booking.scheduledDate.getTime() !== expectedScheduledDate.getTime()) {
          return { updated: false as const, reason: 'stale' as const }
        }
        const serviceType = await transaction.serviceType.findUnique({
          where: { id: booking.serviceTypeId },
          select: { estimatedDurationMinutes: true },
        })
        if (!serviceType) return { updated: false as const, reason: 'invalid_state' as const }
        const center = await transaction.serviceCenter.findUnique({
          where: { id: booking.serviceCenterId },
          select: { timeZone: true },
        })
        if (!center?.timeZone) return { updated: false as const, reason: 'configuration' as const }
        const date = dateInTimeZone(scheduledDate, center.timeZone)
        const availability = await availableSlotsWithTransaction(
          transaction,
          booking.serviceCenterId,
          date,
          serviceType.estimatedDurationMinutes,
          bookingId,
        )
        if (!availability.configured) return { updated: false as const, reason: 'configuration' as const }
        if (scheduledDate <= new Date() || !availability.slots.some((slot) => slot.getTime() === scheduledDate.getTime())) {
          return { updated: false as const, reason: 'unavailable' as const }
        }
        const result = await transaction.booking.updateMany({
          where: { id: bookingId, customerId, status: BookingStatus.PENDING, scheduledDate: expectedScheduledDate },
          data: { scheduledDate, notes },
        })
        if (result.count === 1) return { updated: true as const }
        const latest = await transaction.booking.findFirst({
          where: { id: bookingId, customerId },
          select: { id: true, status: true },
        })
        if (!latest) return { updated: false as const, reason: 'not_found' as const }
        if (latest.status === BookingStatus.PENDING) return { updated: false as const, reason: 'stale' as const }
        return { updated: false as const, reason: 'invalid_state' as const }
      })
    },
    async confirmPendingForProvider(bookingId: number) {
      const result = await prisma.booking.updateMany({
        where: { id: bookingId, status: 'PENDING' },
        data: { status: 'CONFIRMED' },
      })
      return result.count
    },
    async rejectPendingForProvider(bookingId: number) {
      const result = await prisma.booking.updateMany({
        where: { id: bookingId, status: BookingStatus.PENDING },
        data: { status: BookingStatus.REJECTED },
      })
      return result.count
    },
    async startConfirmedForProvider(bookingId: number) {
      const result = await prisma.booking.updateMany({
        where: { id: bookingId, status: BookingStatus.CONFIRMED },
        data: { status: BookingStatus.IN_PROGRESS },
      })
      return result.count
    },
    async completeInProgressForProvider(bookingId: number) {
      const result = await prisma.booking.updateMany({
        where: { id: bookingId, status: BookingStatus.IN_PROGRESS },
        data: { status: BookingStatus.COMPLETED },
      })
      return result.count
    },
    async findStatusById(bookingId: number) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { status: true },
      })
      return booking?.status ?? null
    },
    async cancelPendingForCustomer(bookingId: number, customerId: number) {
      const result = await prisma.booking.updateMany({
        where: { id: bookingId, customerId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      })
      return result.count
    },
    async findStatusForCustomer(bookingId: number, customerId: number) {
      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, customerId },
        select: { status: true },
      })
      return booking?.status ?? null
    },
    async findForCustomerById(bookingId: number, customerId: number) {
      return prisma.booking.findFirst({
        where: { id: bookingId, customerId },
        select: {
          id: true,
          status: true,
          scheduledDate: true,
          createdAt: true,
          serviceTypeId: true,
          notes: true,
          vehicle: { select: { make: true, model: true, licensePlate: true } },
          serviceType: { select: { name: true } },
          serviceCenter: { select: { name: true, address: true, phone: true, operatingHours: true, timeZone: true } },
        },
      })
    },
    async findManyForCustomer(customerId: number) {
      return prisma.booking.findMany({
        where: { customerId },
        select: {
          id: true,
          status: true,
          scheduledDate: true,
          createdAt: true,
          vehicle: { select: { make: true, model: true, licensePlate: true } },
          serviceType: { select: { name: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })
    },
    async findUnique({ where }: { where: { id: number } }) {
      return null
    },
    async create({ data }: { data: any }) {
      return prisma.booking.create({
        data: {
          customerId: data.customerId,
          vehicleId: data.vehicleId,
          serviceTypeId: data.serviceTypeId,
          serviceCenterId: data.serviceCenterId,
          scheduledDate: data.scheduledDate,
          notes: data.notes,
          status: 'PENDING',
        },
      })
    },
  },
  serviceRecord: {
    async createForInProgressBooking(data: Parameters<ServiceRecordRepository['createForInProgressBooking']>[0]) {
      return prisma.$transaction(async (transaction) => {
        const locked = await transaction.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM bookings WHERE id = ${data.bookingId} FOR UPDATE
        `
        if (locked.length === 0) return { reason: 'not_found' as const }

        const booking = await transaction.booking.findUnique({
          where: { id: data.bookingId },
          select: { status: true, mechanicId: true },
        })
        if (!booking) return { reason: 'not_found' as const }
        if (booking.status !== BookingStatus.IN_PROGRESS) return { reason: 'invalid_state' as const }
        const existing = await transaction.service.findUnique({
          where: { bookingId: data.bookingId },
          select: { id: true },
        })
        if (existing) return { reason: 'already_recorded' as const }

        const partIds = data.parts.map((part) => part.partId).sort((a, b) => a - b)
        const stockById = new Map<number, number>()
        for (const partId of partIds) {
          const rows = await transaction.$queryRaw<Array<{ id: number; stockQuantity: number }>>`
            SELECT id, stock_quantity AS "stockQuantity" FROM parts WHERE id = ${partId} FOR UPDATE
          `
          if (rows.length === 0) return { reason: 'invalid_part' as const }
          stockById.set(rows[0].id, rows[0].stockQuantity)
        }
        if (data.parts.some((part) => (stockById.get(part.partId) ?? -1) < part.quantity)) {
          return { reason: 'insufficient_stock' as const }
        }
        const parts = data.parts.length === 0 ? [] : await transaction.part.findMany({
          where: { id: { in: data.parts.map((part) => part.partId) } },
          select: { id: true, unitPrice: true },
        })
        if (parts.length !== data.parts.length) return { reason: 'invalid_part' as const }

        const service = await transaction.service.create({
          data: {
            bookingId: data.bookingId,
            mechanicId: booking.mechanicId,
            diagnosisNotes: data.diagnosisNotes,
            workPerformed: data.workPerformed,
            laborCost: data.laborCost,
            completedAt: new Date(),
          },
          select: { id: true },
        })
        if (data.parts.length > 0) {
          const priceById = new Map(parts.map((part) => [part.id, part.unitPrice]))
          await transaction.servicePart.createMany({
            data: data.parts.map((part) => ({
              serviceId: service.id,
              partId: part.partId,
              quantity: part.quantity,
              unitPriceAtTime: priceById.get(part.partId)!,
            })),
          })
        }
        const completed = await transaction.booking.updateMany({
          where: { id: data.bookingId, status: BookingStatus.IN_PROGRESS },
          data: { status: BookingStatus.COMPLETED },
        })
        if (completed.count !== 1) throw new Error('Booking state changed while recording service.')
        return { serviceId: service.id }
      })
    },
    async findManyForActor(customerId?: number) {
      return prisma.service.findMany({
        where: customerId === undefined ? undefined : { booking: { customerId } },
        select: {
          id: true,
          diagnosisNotes: true,
          workPerformed: true,
          laborCost: true,
          startedAt: true,
          completedAt: true,
          booking: {
            select: {
              id: true,
              scheduledDate: true,
              vehicle: { select: { make: true, model: true, licensePlate: true } },
              serviceType: { select: { name: true } },
              customer: { select: { name: true } },
            },
          },
          mechanic: { select: { name: true } },
          serviceParts: {
            select: {
              quantity: true,
              unitPriceAtTime: true,
              part: { select: { name: true, partNumber: true } },
            },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      })
    },
  },
  invoice: {
    async issueForCompletedBooking(bookingId: number, issuedAt: Date) {
      return prisma.$transaction(async (transaction) => {
        const locked = await transaction.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE
        `
        if (locked.length === 0) return { reason: 'not_found' as const }

        const booking = await transaction.booking.findUnique({
          where: { id: bookingId },
          select: { status: true },
        })
        if (!booking) return { reason: 'not_found' as const }

        const existing = await transaction.invoice.findUnique({
          where: { bookingId },
          select: { id: true },
        })
        if (existing) return { reason: 'already_issued' as const }
        if (booking.status !== BookingStatus.COMPLETED) return { reason: 'invalid_state' as const }

        const serviceLock = await transaction.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM services WHERE booking_id = ${bookingId} FOR UPDATE
        `
        if (serviceLock.length === 0) return { reason: 'missing_service' as const }
        const serviceId = serviceLock[0].id
        await transaction.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM service_parts WHERE service_id = ${serviceId} ORDER BY id FOR UPDATE
        `

        const [totals] = await transaction.$queryRaw<Array<{
          subtotal: Prisma.Decimal
          tax: Prisma.Decimal
          total: Prisma.Decimal
        }>>`
          SELECT calculated_subtotal AS subtotal,
            calculated_tax AS tax,
            calculated_total AS total
          FROM calculate_invoice_totals(CAST(${serviceId} AS INTEGER))
        `
        if (!totals) throw new Error('Invoice calculation returned no totals.')

        const invoiceNumber = `INV-${bookingId}`
        const created = await transaction.invoice.create({
          data: {
            bookingId,
            invoiceNumber,
            subtotal: totals.subtotal,
            tax: totals.tax,
            totalAmount: totals.total,
            issuedAt,
            // No payment term is defined in PLAN.md, and payment processing is out of scope.
            dueDate: issuedAt,
          },
          select: { id: true, invoiceNumber: true },
        })
        const transitioned = await transaction.booking.updateMany({
          where: { id: bookingId, status: BookingStatus.COMPLETED },
          data: { status: BookingStatus.INVOICED },
        })
        if (transitioned.count !== 1) throw new Error('Booking state changed while issuing invoice.')
        return { invoiceId: created.id, invoiceNumber: created.invoiceNumber }
      })
    },
    async findCompletedWithoutInvoice() {
      return prisma.booking.findMany({
        where: { status: BookingStatus.COMPLETED, invoice: { is: null }, service: { isNot: null } },
        select: {
          id: true,
          scheduledDate: true,
          customer: { select: { name: true } },
          vehicle: { select: { make: true, model: true, licensePlate: true } },
          serviceType: { select: { name: true } },
          service: {
            select: {
              laborCost: true,
              serviceParts: {
                select: { quantity: true, unitPriceAtTime: true, part: { select: { name: true } } },
                orderBy: { id: 'asc' },
              },
            },
          },
        },
        orderBy: [{ scheduledDate: 'desc' }, { id: 'desc' }],
      })
    },
    async findManyForActor(customerId?: number) {
      return prisma.invoice.findMany({
        where: customerId === undefined ? undefined : { booking: { customerId } },
        select: invoiceViewSelect,
        orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }],
      })
    },
    async findForActor(invoiceId: number, customerId?: number) {
      return prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          ...(customerId === undefined ? {} : { booking: { customerId } }),
        },
        select: invoiceViewSelect,
      })
    },
  } satisfies InvoiceRepository,
  review: {
    async createForCompletedBooking(input: Parameters<ReviewRepository['createForCompletedBooking']>[0]) {
      try {
        return await prisma.$transaction(async (transaction) => {
          const booking = await transaction.booking.findFirst({
            where: { id: input.bookingId, customerId: input.customerId },
            select: {
              status: true,
              service: { select: { id: true } },
              review: { select: { id: true } },
            },
          })
          if (!booking) return { reason: 'not_found' as const }
          if ((booking.status !== BookingStatus.COMPLETED && booking.status !== BookingStatus.INVOICED) || !booking.service) {
            return { reason: 'ineligible' as const }
          }
          if (booking.review) return { reason: 'already_reviewed' as const }

          const review = await transaction.review.create({
            data: {
              bookingId: input.bookingId,
              customerId: input.customerId,
              rating: input.rating,
              comment: input.comment,
            },
            select: { id: true, bookingId: true, rating: true, comment: true, createdAt: true },
          })
          return { review }
        })
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
          return { reason: 'already_reviewed' as const }
        }
        throw error
      }
    },
    async findForCustomerBooking(bookingId: number, customerId: number) {
      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, customerId },
        select: {
          status: true,
          service: { select: { id: true } },
          review: { select: { id: true, bookingId: true, rating: true, comment: true, createdAt: true } },
        },
      })
      return booking ? { status: booking.status, hasService: booking.service !== null, review: booking.review } : null
    },
  } satisfies ReviewRepository,
  adminDashboard: {
    async findServiceCenter() {
      return prisma.serviceCenter.findFirst({
        select: { id: true, name: true },
        orderBy: { id: 'asc' },
      })
    },
    async countBookingsByStatus(serviceCenterId: number) {
      const groups = await prisma.booking.groupBy({
        by: ['status'],
        where: { serviceCenterId },
        _count: { _all: true },
      })
      return groups.map(({ status, _count }) => ({ status, count: _count._all }))
    },
    async countMechanics(serviceCenterId: number) {
      const [total, active] = await Promise.all([
        prisma.mechanic.count({ where: { serviceCenterId } }),
        prisma.mechanic.count({ where: { serviceCenterId, isActive: true } }),
      ])
      return { total, active }
    },
    async countLowStockParts() {
      const rows = await prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::INTEGER AS count
        FROM parts
        WHERE stock_quantity <= reorder_threshold
      `
      return rows[0]?.count ?? 0
    },
    async invoiceTotals(serviceCenterId: number) {
      const [paid, unpaid] = await Promise.all([
        prisma.invoice.aggregate({
          where: { status: 'PAID', booking: { serviceCenterId } },
          _count: { _all: true },
          _sum: { totalAmount: true },
        }),
        prisma.invoice.aggregate({
          where: { status: 'UNPAID', booking: { serviceCenterId } },
          _count: { _all: true },
          _sum: { totalAmount: true },
        }),
      ])
      return {
        paidCount: paid._count._all,
        paidAmount: paid._sum.totalAmount?.toFixed(2) ?? '0.00',
        unpaidCount: unpaid._count._all,
        unpaidAmount: unpaid._sum.totalAmount?.toFixed(2) ?? '0.00',
      }
    },
    async reviewSummary(serviceCenterId: number) {
      const summary = await prisma.review.aggregate({
        where: { booking: { serviceCenterId } },
        _count: { _all: true },
        _avg: { rating: true },
      })
      return { count: summary._count._all, averageRating: summary._avg.rating }
    },
    async recentBookings(serviceCenterId: number) {
      return prisma.booking.findMany({
        where: { serviceCenterId },
        select: { id: true, status: true, scheduledDate: true, serviceType: { select: { name: true } } },
        orderBy: [{ scheduledDate: 'desc' }, { id: 'desc' }],
        take: 5,
      })
    },
  } satisfies AdminDashboardRepository,
  workflowEmail: {
    async findBookingEmailContext(bookingId: number) {
      return prisma.booking.findUnique({ where: { id: bookingId }, select: bookingNotificationSelect })
    },
    async findInvoiceEmailContext(invoiceId: number) {
      return prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { invoiceNumber: true, booking: { select: bookingNotificationSelect } },
      })
    },
  } satisfies WorkflowEmailRepository,
  part: {
    async findAvailableInventory() {
      return prisma.part.findMany({
        where: { stockQuantity: { gt: 0 } },
        select: { id: true, name: true, partNumber: true, unitPrice: true, stockQuantity: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      })
    },
  },
  auditLog: {
    async create({ data }: { data: any }) {
      // Placeholder
      return { id: 1, ...data, loggedAt: new Date().toISOString() }
    },
  },
  mechanic: {
    async findCurrentServiceCenterId() {
      const center = await prisma.serviceCenter.findFirst({ select: { id: true }, orderBy: { id: 'asc' } })
      return center?.id ?? null
    },
    async findMany(serviceCenterId: number) {
      return prisma.mechanic.findMany({
        where: { serviceCenterId },
        select: {
          id: true,
          name: true,
          specialization: true,
          phone: true,
          isActive: true,
          _count: { select: { bookings: true, services: true } },
        },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { id: 'asc' }],
      })
    },
    async create(serviceCenterId: number, data: MechanicWrite) {
      return prisma.mechanic.create({ data: { ...data, serviceCenterId } })
    },
    async update(serviceCenterId: number, id: number, data: MechanicWrite) {
      const result = await prisma.mechanic.updateMany({ where: { id, serviceCenterId }, data })
      return result.count === 1
    },
    async deleteOrDeactivate(serviceCenterId: number, id: number): Promise<'deleted' | 'deactivated' | null> {
      return prisma.$transaction(async (transaction) => {
        return deleteMechanicRecord(serviceCenterId, id, {
          lockServiceCenter: (centerId) => lockSchedulingCenter(transaction, centerId).then(() => undefined),
          exists: async (centerId, mechanicId) => {
            const rows = await transaction.$queryRaw<Array<{ id: number }>>`
              SELECT id FROM mechanics
              WHERE id = ${mechanicId} AND service_center_id = ${centerId}
              FOR UPDATE
            `
            return rows.length === 1
          },
          hasHistory: async (mechanicId) => {
            const [bookings, services] = await Promise.all([
              transaction.booking.count({ where: { mechanicId } }),
              transaction.service.count({ where: { mechanicId } }),
            ])
            return bookings + services > 0
          },
          deactivate: async (mechanicId) => {
            await transaction.mechanic.update({ where: { id: mechanicId }, data: { isActive: false } })
          },
          delete: async (mechanicId) => {
            await transaction.mechanic.delete({ where: { id: mechanicId } })
          },
        })
      })
    },
  },
}
