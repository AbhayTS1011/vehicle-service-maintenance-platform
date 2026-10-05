// =====================================================================
// Resilient Database Persistence Layer (Zero external dependency)
// Mirrors relational schema for robust development and execution
// =====================================================================

import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'database', 'store.json')

interface StoreData {
  users: any[]
  vehicles: any[]
  bookings: any[]
  auditLogs: any[]
}

function loadStore(): StoreData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8')
      return JSON.parse(content)
    }
  } catch (e) {
    // ignore
  }
  return { users: [], vehicles: [], bookings: [], auditLogs: [] }
}

function saveStore(data: StoreData) {
  try {
    const dir = path.dirname(DATA_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
  } catch (e) {
    // ignore
  }
}

export const db = {
  user: {
    async findUnique({ where }: { where: { id?: number; email?: string } }) {
      const store = loadStore()
      if (where.id !== undefined) {
        return store.users.find((u) => u.id === where.id) || null
      }
      if (where.email !== undefined) {
        return store.users.find((u) => u.email === where.email) || null
      }
      return null
    },
    async create({ data }: { data: any }) {
      const store = loadStore()
      const newUser = {
        id: store.users.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data,
      }
      store.users.push(newUser)
      saveStore(store)
      return newUser
    },
  },
  vehicle: {
    async findUnique({ where }: { where: { id: number } }) {
      const store = loadStore()
      return store.vehicles.find((v) => v.id === where.id) || null
    },
    async create({ data }: { data: any }) {
      const store = loadStore()
      const newVehicle = {
        id: store.vehicles.length + 1,
        createdAt: new Date().toISOString(),
        ...data,
      }
      store.vehicles.push(newVehicle)
      saveStore(store)
      return newVehicle
    },
  },
  booking: {
    async findUnique({ where }: { where: { id: number } }) {
      const store = loadStore()
      return store.bookings.find((b) => b.id === where.id) || null
    },
    async create({ data }: { data: any }) {
      const store = loadStore()
      const newBooking = {
        id: store.bookings.length + 1,
        createdAt: new Date().toISOString(),
        ...data,
      }
      store.bookings.push(newBooking)
      saveStore(store)
      return newBooking
    },
  },
  auditLog: {
    async create({ data }: { data: any }) {
      const store = loadStore()
      const newLog = {
        id: store.auditLogs.length + 1,
        loggedAt: new Date().toISOString(),
        ...data,
      }
      store.auditLogs.push(newLog)
      saveStore(store)
      return newLog
    },
  },
}
