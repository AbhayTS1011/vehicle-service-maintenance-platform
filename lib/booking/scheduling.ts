export type WeeklyOpening = { dayOfWeek: number; opensAt: string; closesAt: string }
export type ScheduledInterval = { start: Date; end: Date }

// Public appointment starts are offered on a quarter-hour grid.
const SLOT_MINUTES = 15

type LocalDateTime = { year: number; month: number; day: number; hour: number; minute: number; weekday: number }

function localParts(date: Date, timeZone: string): LocalDateTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    weekday: weekdays[values.weekday],
  }
}

export function dateInTimeZone(date: Date, timeZone: string): string {
  const parts = localParts(date, timeZone)
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return true
  } catch {
    return false
  }
}

function localDateTimeToUtc(dateText: string, timeText: string, timeZone: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeText)
  if (!dateMatch || !timeMatch || !isValidTimeZone(timeZone)) return null
  const [, yearText, monthText, dayText] = dateMatch
  const [, hourText, minuteText] = timeMatch
  const target = Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText), Number(hourText), Number(minuteText))
  if (new Date(target).toISOString().slice(0, 10) !== dateText || Number(hourText) > 23 || Number(minuteText) > 59) return null

  let guess = target
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = localParts(new Date(guess), timeZone)
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
    const difference = target - represented
    if (difference === 0) return new Date(guess)
    guess += difference
  }
  return null
}

export function maxConcurrentAppointments(intervals: ScheduledInterval[]): number {
  const events = intervals.flatMap(({ start, end }) => [
    { at: start.getTime(), change: 1 },
    { at: end.getTime(), change: -1 },
  ]).sort((left, right) => left.at - right.at || left.change - right.change)
  let concurrent = 0
  let maximum = 0
  for (const event of events) {
    concurrent += event.change
    maximum = Math.max(maximum, concurrent)
  }
  return maximum
}

function hasCapacity(
  existing: ScheduledInterval[],
  candidate: ScheduledInterval,
  capacity: number,
): boolean {
  if (capacity < 1) return false
  const overlapping = existing
    .filter((interval) => interval.start < candidate.end && interval.end > candidate.start)
    .map((interval) => ({
      start: interval.start > candidate.start ? interval.start : candidate.start,
      end: interval.end < candidate.end ? interval.end : candidate.end,
    }))
  return maxConcurrentAppointments([...overlapping, candidate]) <= capacity
}

export function availableAppointmentSlots(options: {
  date: string
  durationMinutes: number
  timeZone: string
  weeklyHours: WeeklyOpening[]
  activeMechanicCount: number
  existingAppointments: ScheduledInterval[]
}): Date[] {
  const { date, durationMinutes, timeZone, weeklyHours, activeMechanicCount, existingAppointments } = options
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isSafeInteger(durationMinutes) || durationMinutes < 1 ||
      activeMechanicCount < 1 || !isValidTimeZone(timeZone)) return []
  const parsedDate = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return []
  const weekday = parsedDate.getUTCDay()
  const slots: Date[] = []

  for (const opening of weeklyHours.filter((hours) => hours.dayOfWeek === weekday)) {
    if (!/^\d{2}:\d{2}$/.test(opening.opensAt) || !/^\d{2}:\d{2}$/.test(opening.closesAt)) continue
    const [openHour, openMinute] = opening.opensAt.split(':').map(Number)
    const [closeHour, closeMinute] = opening.closesAt.split(':').map(Number)
    if (openHour > 23 || closeHour > 23 || openMinute > 59 || closeMinute > 59 ||
        openHour * 60 + openMinute >= closeHour * 60 + closeMinute) continue

    const opens = localDateTimeToUtc(date, opening.opensAt, timeZone)
    const closes = localDateTimeToUtc(date, opening.closesAt, timeZone)
    if (!opens || !closes || closes <= opens) continue

    const endLimit = closes.getTime() - durationMinutes * 60_000
    for (let start = opens.getTime(); start <= endLimit; start += SLOT_MINUTES * 60_000) {
      const candidate = { start: new Date(start), end: new Date(start + durationMinutes * 60_000) }
      if (hasCapacity(existingAppointments, candidate, activeMechanicCount)) slots.push(candidate.start)
    }
  }

  return Array.from(new Map(slots.map((slot) => [slot.toISOString(), slot])).values())
}

export function requestedAppointmentIsAvailable(options: {
  requestedStart: Date
  date: string
  durationMinutes: number
  timeZone: string
  weeklyHours: WeeklyOpening[]
  activeMechanicCount: number
  existingAppointments: ScheduledInterval[]
}): boolean {
  return availableAppointmentSlots(options).some((slot) => slot.getTime() === options.requestedStart.getTime())
}
