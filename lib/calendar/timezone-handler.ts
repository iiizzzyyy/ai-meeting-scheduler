/**
 * Timezone and Calendar Logic Handler
 * Handles CET timezone, Swedish holidays, and international calendar operations
 */

import { format, addDays, addMinutes } from 'date-fns'
// TODO: implement additional date functions - import { startOfWeek, endOfWeek, isSameDay } from 'date-fns'
// TODO: implement additional date functions - import { parseISO, startOfDay, endOfDay, isWeekend } from 'date-fns'
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'

export interface Holiday {
  date: string // YYYY-MM-DD format
  name: string
  country: 'SE' | 'US' | 'GB' | 'DE' | 'FR'
  type: 'national' | 'regional' | 'religious' | 'bank'
}

export interface WorkingHours {
  timezone: string
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  workingDays: number[] // 0=Sunday, 1=Monday, etc.
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  timezone: string
  allDay?: boolean
  recurring?: boolean
}

export class TimezoneHandler {
  private timezone: string
  private workingHours: WorkingHours
  private holidays: Holiday[]

  constructor(
    timezone: string = 'Europe/Stockholm', // CET/CEST
    workingHours?: Partial<WorkingHours>
  ) {
    this.timezone = timezone
    this.workingHours = {
      timezone,
      startTime: '09:00',
      endTime: '17:00',
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      ...workingHours
    }
    this.holidays = this.loadSwedishHolidays()
  }

  /**
   * Convert UTC time to local timezone
   */
  toLocalTime(utcDate: Date): Date {
    return toZonedTime(utcDate, this.timezone)
  }

  /**
   * Convert local time to UTC
   */
  toUTC(localDate: Date): Date {
    return fromZonedTime(localDate, this.timezone)
  }

  /**
   * Format date in the local timezone
   */
  formatInTimezone(date: Date, formatStr: string = 'yyyy-MM-dd HH:mm:ss'): string {
    return formatInTimeZone(date, this.timezone, formatStr)
  }

  /**
   * Get current time in the local timezone
   */
  getCurrentTime(): Date {
    return toZonedTime(new Date(), this.timezone)
  }

  /**
   * Check if a date is a working day
   */
  isWorkingDay(date: Date): boolean {
    const localDate = this.toLocalTime(date)
    const dayOfWeek = localDate.getDay()
    
    // Check if it's a working day of the week
    if (!this.workingHours.workingDays.includes(dayOfWeek)) {
      return false
    }

    // Check if it's a holiday
    if (this.isHoliday(localDate)) {
      return false
    }

    return true
  }

  /**
   * Check if a date is a holiday
   */
  isHoliday(date: Date): boolean {
    const dateString = format(date, 'yyyy-MM-dd')
    return this.holidays.some(holiday => holiday.date === dateString)
  }

  /**
   * Get holiday information for a specific date
   */
  getHolidayInfo(date: Date): Holiday | null {
    const dateString = format(date, 'yyyy-MM-dd')
    return this.holidays.find(holiday => holiday.date === dateString) || null
  }

  /**
   * Check if a time is within working hours
   */
  isWithinWorkingHours(date: Date): boolean {
    const localDate = this.toLocalTime(date)
    const timeStr = format(localDate, 'HH:mm')
    
    return timeStr >= this.workingHours.startTime && timeStr <= this.workingHours.endTime
  }

  /**
   * Get next available working time slot
   */
  getNextWorkingSlot(fromDate: Date, durationMinutes: number = 30): Date | null {
    let current = new Date(fromDate)
    const maxDaysToCheck = 30 // Limit search to 30 days

    for (let i = 0; i < maxDaysToCheck; i++) {
      if (this.isWorkingDay(current)) {
        const workingStartTime = this.getWorkingStartTime(current)
        const workingEndTime = this.getWorkingEndTime(current)
        
        // If the current time is before working hours, start from working hours
        if (current < workingStartTime) {
          current = new Date(workingStartTime)
        }

        // Check if there's enough time left in the working day
        const endTime = addMinutes(current, durationMinutes)
        if (endTime <= workingEndTime) {
          return current
        }
      }
      
      // Move to next day at working start time
      current = addDays(current, 1)
      current = this.getWorkingStartTime(current)
    }

    return null // No available slot found within the search period
  }

  /**
   * Get working start time for a specific date
   */
  private getWorkingStartTime(date: Date): Date {
    const localDate = this.toLocalTime(date)
    const [hours, minutes] = this.workingHours.startTime.split(':').map(Number)
    
    const workingStart = new Date(localDate)
    workingStart.setHours(hours, minutes, 0, 0)
    
    return this.toUTC(workingStart)
  }

  /**
   * Get working end time for a specific date
   */
  private getWorkingEndTime(date: Date): Date {
    const localDate = this.toLocalTime(date)
    const [hours, minutes] = this.workingHours.endTime.split(':').map(Number)
    
    const workingEnd = new Date(localDate)
    workingEnd.setHours(hours, minutes, 0, 0)
    
    return this.toUTC(workingEnd)
  }

  /**
   * Generate available time slots for a date range
   */
  generateTimeSlots(
    startDate: Date,
    endDate: Date,
    slotDuration: number = 30,
    slotInterval: number = 15
  ): { start: Date; end: Date; available: boolean }[] {
    const slots: { start: Date; end: Date; available: boolean }[] = []
    let current = new Date(startDate)

    while (current <= endDate) {
      if (this.isWorkingDay(current)) {
        const daySlots = this.generateDaySlots(current, slotDuration, slotInterval)
        slots.push(...daySlots)
      }
      current = addDays(current, 1)
    }

    return slots
  }

  /**
   * Generate time slots for a specific day
   */
  private generateDaySlots(
    date: Date,
    slotDuration: number,
    slotInterval: number
  ): { start: Date; end: Date; available: boolean }[] {
    const slots: { start: Date; end: Date; available: boolean }[] = []
    const workingStart = this.getWorkingStartTime(date)
    const workingEnd = this.getWorkingEndTime(date)
    
    let current = new Date(workingStart)

    while (current.getTime() + slotDuration * 60 * 1000 <= workingEnd.getTime()) {
      const slotEnd = addMinutes(current, slotDuration)
      
      slots.push({
        start: new Date(current),
        end: slotEnd,
        available: true // This would be checked against existing bookings in a real app
      })

      current = addMinutes(current, slotInterval)
    }

    return slots
  }

  /**
   * Load Swedish national holidays (2024-2025)
   */
  private loadSwedishHolidays(): Holiday[] {
    return [
      // 2024 Holidays
      { date: '2024-01-01', name: 'Nyårsdagen', country: 'SE', type: 'national' },
      { date: '2024-01-06', name: 'Trettondedag jul', country: 'SE', type: 'national' },
      { date: '2024-03-29', name: 'Långfredagen', country: 'SE', type: 'national' },
      { date: '2024-04-01', name: 'Annandag påsk', country: 'SE', type: 'national' },
      { date: '2024-05-01', name: 'Första maj', country: 'SE', type: 'national' },
      { date: '2024-05-09', name: 'Kristi himmelfärdsdag', country: 'SE', type: 'national' },
      { date: '2024-05-20', name: 'Annandag pingst', country: 'SE', type: 'national' },
      { date: '2024-06-06', name: 'Sveriges nationaldag', country: 'SE', type: 'national' },
      { date: '2024-06-21', name: 'Midsommarafton', country: 'SE', type: 'national' },
      { date: '2024-06-22', name: 'Midsommardagen', country: 'SE', type: 'national' },
      { date: '2024-11-02', name: 'Alla helgons dag', country: 'SE', type: 'national' },
      { date: '2024-12-24', name: 'Julafton', country: 'SE', type: 'national' },
      { date: '2024-12-25', name: 'Juldagen', country: 'SE', type: 'national' },
      { date: '2024-12-26', name: 'Annandag jul', country: 'SE', type: 'national' },
      { date: '2024-12-31', name: 'Nyårsafton', country: 'SE', type: 'national' },

      // 2025 Holidays
      { date: '2025-01-01', name: 'Nyårsdagen', country: 'SE', type: 'national' },
      { date: '2025-01-06', name: 'Trettondedag jul', country: 'SE', type: 'national' },
      { date: '2025-04-18', name: 'Långfredagen', country: 'SE', type: 'national' },
      { date: '2025-04-21', name: 'Annandag påsk', country: 'SE', type: 'national' },
      { date: '2025-05-01', name: 'Första maj', country: 'SE', type: 'national' },
      { date: '2025-05-29', name: 'Kristi himmelfärdsdag', country: 'SE', type: 'national' },
      { date: '2025-06-06', name: 'Sveriges nationaldag', country: 'SE', type: 'national' },
      { date: '2025-06-20', name: 'Midsommarafton', country: 'SE', type: 'national' },
      { date: '2025-06-21', name: 'Midsommardagen', country: 'SE', type: 'national' },
      { date: '2025-11-01', name: 'Alla helgons dag', country: 'SE', type: 'national' },
      { date: '2025-12-24', name: 'Julafton', country: 'SE', type: 'national' },
      { date: '2025-12-25', name: 'Juldagen', country: 'SE', type: 'national' },
      { date: '2025-12-26', name: 'Annandag jul', country: 'SE', type: 'national' },
      { date: '2025-12-31', name: 'Nyårsafton', country: 'SE', type: 'national' },
    ]
  }

  /**
   * Update working hours configuration
   */
  updateWorkingHours(newWorkingHours: Partial<WorkingHours>) {
    this.workingHours = { ...this.workingHours, ...newWorkingHours }
  }

  /**
   * Update timezone
   */
  updateTimezone(newTimezone: string) {
    this.timezone = newTimezone
    this.workingHours.timezone = newTimezone
  }

  /**
   * Add custom holidays
   */
  addHolidays(holidays: Holiday[]) {
    this.holidays.push(...holidays)
  }

  /**
   * Get timezone information
   */
  getTimezoneInfo() {
    return {
      timezone: this.timezone,
      currentTime: this.getCurrentTime(),
      workingHours: this.workingHours,
      holidayCount: this.holidays.length
    }
  }

  /**
   * Check if current time is business hours
   */
  isCurrentlyBusinessHours(): boolean {
    const now = this.getCurrentTime()
    return this.isWorkingDay(now) && this.isWithinWorkingHours(now)
  }
}
