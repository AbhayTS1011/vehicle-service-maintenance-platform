// =====================================================================
// Prisma persistence layer for booking workflows, with legacy mock adapters
// retained for management domains that have not yet migrated to PostgreSQL.
// =====================================================================

import { BookingStatus, PrismaClient, type Prisma } from '@prisma/client'
import type { ProviderConfirmedBookingsQuery, ProviderInProgressBookingsQuery, ProviderPendingBookingsQuery } from './booking/booking-service'
import { availableAppointmentSlots, dateInTimeZone, type ScheduledInterval, type WeeklyOpening } from './booking/scheduling'

const prisma = new PrismaClient()

type BookingTransaction = Prisma.TransactionClient

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
      // In a Prisma implementation, this would query PostgreSQL
      // For now, return mock service center data
      return {
        id: 1,
        name: "Apex Auto Care Center",
        address: "123 Mechanic Street, Auto City, AC 12345",
        phone: "+1-555-0199",
        email: "support@apexautocare.com",
        operatingHours: "Mon-Sat 8:00 AM - 6:00 PM",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    },
    async create({ data }: { data: any }) {
      // Placeholder - service center is pre-configured
      return { id: 1, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    },
    async updateVehicle({ where, data }: { where: { id: number }; data: any }) {
      // For service center, we use updateVehicle with service center data
      // or we can implement a specific update method
      return { id: where.id, ...data, updatedAt: new Date().toISOString() }
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
        await transaction.booking.create({
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
        return { created: true as const }
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
  auditLog: {
    async create({ data }: { data: any }) {
      // Placeholder
      return { id: 1, ...data, loggedAt: new Date().toISOString() }
    },
  },
  mechanic: {
    async findUnique({ where }: { where: { id: number } }) {
      // In a Prisma implementation, this would query PostgreSQL
      // For now, return mock mechanic data
      return {
        id: 1,
        serviceCenterId: 1,
        name: "John Smith",
        specialization: "General Repair",
        phone: "+1-555-0123",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    },
    async create({ data }: { data: any }) {
      // Placeholder - create mechanic associated with service center
      return {
        id: 1,
        serviceCenterId: Number(data.serviceCenterId) || 1,
        name: data.name,
        specialization: data.specialization || '',
        phone: data.phone || '',
        isActive: data.isActive !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    },
    async update({ where, data }: { where: { id: number }; data: any }) {
      // Placeholder - update mechanic
      return {
        id: where.id,
        serviceCenterId: data.serviceCenterId ?? 1,
        name: data.name,
        specialization: data.specialization ?? '',
        phone: data.phone ?? '',
        isActive: data.isActive ?? true,
        updatedAt: new Date().toISOString(),
      }
    },
    async delete({ where }: { where: { id: number } }) {
      // Placeholder - delete mechanic
      return { id: where.id, deleted: true }
    },
  },
}
