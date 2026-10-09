// =====================================================================
// Resilient Database Persistence Layer (In-Memory Only)
// Mirrors relational schema for robust development and execution
// =====================================================================

// In-memory store for development and testing
// Data is lost on server restart - suitable for Phase 3 & 4 vehicle/service center management

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
