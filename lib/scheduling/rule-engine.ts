/**
 * Rule Engine for Scheduling Constraints
 * Enforces AI-parsed scheduling rules during meeting booking
 */

import { format, addDays, isSameDay, differenceInMinutes, addMinutes } from 'date-fns'
// TODO: implement additional date functions - import { isWeekend, parseISO } from 'date-fns'

export interface SchedulingRule {
  id: string
  type: 'weekdays' | 'holidays' | 'timeRange' | 'maxMeetings' | 'duration' | 'buffer' | 'custom'
  enabled: boolean
  description: string
  naturalLanguage: string
  config: Record<string, any>
}

export interface Meeting {
  id: string
  title: string
  start: Date
  end: Date
  duration: number // in minutes
  attendeeEmail: string
  type: 'video' | 'phone' | 'in-person'
  status: 'confirmed' | 'pending' | 'cancelled'
}

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
  conflictReason?: string
}

export interface RuleViolation {
  ruleId: string
  ruleType: string
  description: string
  severity: 'error' | 'warning'
  suggestion?: string
}

export interface BookingValidationResult {
  valid: boolean
  violations: RuleViolation[]
  score: number // 0-100, higher is better
  suggestions?: Date[] // Alternative time suggestions when booking fails
}

// Swedish National Holidays 2024-2025 (example data)
const SWEDISH_HOLIDAYS = [
  '2024-01-01', // New Year's Day
  '2024-01-06', // Epiphany
  '2024-03-29', // Good Friday
  '2024-04-01', // Easter Monday
  '2024-05-01', // Labour Day
  '2024-05-09', // Ascension Day
  '2024-05-20', // Whit Monday
  '2024-06-06', // National Day
  '2024-06-21', // Midsummer Eve
  '2024-06-22', // Midsummer Day
  '2024-11-02', // All Saints' Day
  '2024-12-24', // Christmas Eve
  '2024-12-25', // Christmas Day
  '2024-12-26', // Boxing Day
  '2024-12-31', // New Year's Eve
  '2025-01-01', // New Year's Day
  '2025-01-06', // Epiphany
  '2025-04-18', // Good Friday
  '2025-04-21', // Easter Monday
  '2025-05-01', // Labour Day
  '2025-05-29', // Ascension Day
  '2025-06-06', // National Day
  '2025-06-20', // Midsummer Eve
  '2025-06-21', // Midsummer Day
  '2025-11-01', // All Saints' Day
  '2025-12-24', // Christmas Eve
  '2025-12-25', // Christmas Day
  '2025-12-26', // Boxing Day
  '2025-12-31', // New Year's Eve
]

export class SchedulingRuleEngine {
  private rules: SchedulingRule[]
  private existingMeetings: Meeting[]

  constructor(rules: SchedulingRule[] = [], existingMeetings: Meeting[] = []) {
    this.rules = rules.filter(rule => rule.enabled)
    this.existingMeetings = existingMeetings
  }

  /**
   * Validate if a proposed meeting booking is allowed
   */
  validateBooking(
    proposedStart: Date,
    duration: number,
    // attendeeEmail?: string  // TODO: implement attendee-specific rules
  ): BookingValidationResult {
    const violations: RuleViolation[] = []
    const proposedEnd = addMinutes(proposedStart, duration)

    // Check each enabled rule
    for (const rule of this.rules) {
      const violation = this.checkRule(rule, proposedStart, proposedEnd, duration)
      if (violation) {
        violations.push(violation)
      }
    }

    return {
      valid: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      score: Math.max(0, 100 - violations.length * 20),
      suggestions: violations.length > 0 ? this.generateAlternativeTimes(proposedStart, duration) : undefined
    }
  }

  /**
   * Generate available time slots for a given date range
   */
  generateAvailableSlots(
    startDate: Date,
    endDate: Date,
    duration: number = 30,
    slotInterval: number = 15
  ): TimeSlot[] {
    const slots: TimeSlot[] = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const daySlots = this.generateDaySlots(current, duration, slotInterval)
      slots.push(...daySlots)
      current.setDate(current.getDate() + 1)
    }

    return slots
  }

  /**
   * Check a specific rule against a proposed booking
   */
  private checkRule(
    rule: SchedulingRule,
    proposedStart: Date,
    proposedEnd: Date,
    duration: number,
    // _attendeeEmail?: string  // TODO: implement attendee-specific rules
  ): RuleViolation | null {
    switch (rule.type) {
      case 'weekdays':
        return this.checkWeekdayRule(rule, proposedStart)

      case 'holidays':
        return this.checkHolidayRule(rule, proposedStart)

      case 'timeRange':
        return this.checkTimeRangeRule(rule, proposedStart, proposedEnd)

      case 'maxMeetings':
        return this.checkMaxMeetingsRule(rule, proposedStart)

      case 'duration':
        return this.checkDurationRule(rule, duration)

      case 'buffer':
        return this.checkBufferRule(rule, proposedStart, proposedEnd)

      case 'custom':
        return this.checkCustomRule(rule, proposedStart)

      default:
        return null
    }
  }

  private checkWeekdayRule(rule: SchedulingRule, proposedStart: Date): RuleViolation | null {
    const dayOfWeek = proposedStart.getDay() // 0 = Sunday, 1 = Monday, etc.
    const allowedDays = rule.config.days || [1, 2, 3, 4, 5] // Default to weekdays

    if (!allowedDays.includes(dayOfWeek)) {
      return {
        ruleId: rule.id,
        ruleType: rule.type,
        description: 'Meetings are only allowed on weekdays',
        severity: 'error',
        suggestion: 'Please select a weekday (Monday-Friday)'
      }
    }

    return null
  }

  private checkHolidayRule(rule: SchedulingRule, proposedStart: Date): RuleViolation | null {
    const dateString = format(proposedStart, 'yyyy-MM-dd')
    const country = rule.config.country || 'SE'

    // For now, only Swedish holidays are implemented
    if (country === 'SE' && SWEDISH_HOLIDAYS.includes(dateString)) {
      return {
        ruleId: rule.id,
        ruleType: rule.type,
        description: `${format(proposedStart, 'MMMM d, yyyy')} is a Swedish national holiday`,
        severity: 'error',
        suggestion: 'Please select a different date that is not a holiday'
      }
    }

    return null
  }

  private checkTimeRangeRule(rule: SchedulingRule, proposedStart: Date, proposedEnd: Date): RuleViolation | null {
    const startTime = rule.config.startTime || '09:00'
    const endTime = rule.config.endTime || '17:00'

    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)

    const proposedStartTime = proposedStart.getHours() * 60 + proposedStart.getMinutes()
    const proposedEndTime = proposedEnd.getHours() * 60 + proposedEnd.getMinutes()
    const allowedStartTime = startHour * 60 + startMinute
    const allowedEndTime = endHour * 60 + endMinute

    if (proposedStartTime < allowedStartTime || proposedEndTime > allowedEndTime) {
      return {
        ruleId: rule.id,
        ruleType: rule.type,
        description: `Meetings must be between ${startTime} and ${endTime}`,
        severity: 'error',
        suggestion: `Please select a time within working hours (${startTime} - ${endTime})`
      }
    }

    return null
  }

  private checkMaxMeetingsRule(rule: SchedulingRule, proposedStart: Date): RuleViolation | null {
    const maxPerDay = rule.config.maxPerDay || 3
    const proposedDate = format(proposedStart, 'yyyy-MM-dd')

    const meetingsOnDay = this.existingMeetings.filter(meeting =>
      format(meeting.start, 'yyyy-MM-dd') === proposedDate &&
      meeting.status !== 'cancelled'
    ).length

    if (meetingsOnDay >= maxPerDay) {
      return {
        ruleId: rule.id,
        ruleType: rule.type,
        description: `Maximum ${maxPerDay} meetings allowed per day (${meetingsOnDay} already scheduled)`,
        severity: 'error',
        suggestion: 'Please select a different date or reschedule an existing meeting'
      }
    }

    return null
  }

  private checkDurationRule(rule: SchedulingRule, duration: number): RuleViolation | null {
    const allowedDurations = rule.config.allowedDurations || [15, 30, 45]

    if (!allowedDurations.includes(duration)) {
      return {
        ruleId: rule.id,
        ruleType: rule.type,
        description: `Meeting duration must be one of: ${allowedDurations.join(', ')} minutes`,
        severity: 'error',
        suggestion: `Please select a duration of ${allowedDurations.join(', ')} minutes`
      }
    }

    return null
  }

  private checkBufferRule(rule: SchedulingRule, proposedStart: Date, proposedEnd: Date): RuleViolation | null {
    const bufferMinutes = rule.config.bufferMinutes || 15

    // Check for conflicts with existing meetings
    for (const meeting of this.existingMeetings) {
      if (meeting.status === 'cancelled') continue

      const timeDiffStart = Math.abs(differenceInMinutes(proposedStart, meeting.end))
      const timeDiffEnd = Math.abs(differenceInMinutes(proposedEnd, meeting.start))

      if (timeDiffStart < bufferMinutes || timeDiffEnd < bufferMinutes) {
        return {
          ruleId: rule.id,
          ruleType: rule.type,
          description: `Minimum ${bufferMinutes}-minute gap required between meetings`,
          severity: 'error',
          suggestion: `Please select a time at least ${bufferMinutes} minutes away from existing meetings`
        }
      }
    }

    return null
  }

  private checkCustomRule(rule: SchedulingRule, proposedStart: Date /* _proposedEnd: Date, _duration: number */): RuleViolation | null {
    // For custom rules, we'll implement basic pattern matching
    // This is a simplified implementation - in production, you'd want more sophisticated NLP
    const customRuleText = rule.config.rule?.toLowerCase() || ''

    if (customRuleText.includes('first monday') && proposedStart.getDay() === 1) {
      const firstMonday = new Date(proposedStart.getFullYear(), proposedStart.getMonth(), 1)
      while (firstMonday.getDay() !== 1) {
        firstMonday.setDate(firstMonday.getDate() + 1)
      }

      if (isSameDay(proposedStart, firstMonday)) {
        return {
          ruleId: rule.id,
          ruleType: rule.type,
          description: 'No meetings allowed on the first Monday of the month',
          severity: 'error',
          suggestion: 'Please select a different date'
        }
      }
    }

    return null
  }

  /**
   * Internal validation method that doesn't generate alternatives (to avoid infinite recursion)
   */
  private validateBookingInternal(
    proposedStart: Date,
    duration: number,
    // attendeeEmail?: string  // TODO: implement attendee-specific rules
  ): BookingValidationResult {
    const violations: RuleViolation[] = []
    const proposedEnd = addMinutes(proposedStart, duration)

    // Check each enabled rule
    for (const rule of this.rules) {
      const violation = this.checkRule(rule, proposedStart, proposedEnd, duration)
      if (violation) {
        violations.push(violation)
      }
    }

    return {
      valid: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      score: Math.max(0, 100 - violations.length * 20),
      // No suggestions to avoid recursion
    }
  }

  /**
   * Generate alternative time suggestions when a booking conflicts with rules
   */
  private generateAlternativeTimes(originalTime: Date, duration: number): Date[] {
    const alternatives: Date[] = []
    const baseDate = new Date(originalTime)

    // Try different time slots on the same day
    for (let hour = 9; hour <= 16; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const altTime = new Date(baseDate)
        altTime.setHours(hour, minute, 0, 0)

        if (altTime.getTime() !== originalTime.getTime()) {
          const validation = this.validateBookingInternal(altTime, duration)
          if (validation.valid) {
            alternatives.push(altTime)
            if (alternatives.length >= 3) break
          }
        }
      }
      if (alternatives.length >= 3) break
    }

    // If no alternatives on same day, try next few days
    if (alternatives.length < 3) {
      for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
        const nextDay = addDays(baseDate, dayOffset)
        nextDay.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0)

        const validation = this.validateBookingInternal(nextDay, duration)
        if (validation.valid) {
          alternatives.push(nextDay)
          if (alternatives.length >= 3) break
        }
      }
    }

    return alternatives.slice(0, 3)
  }

  /**
   * Generate available time slots for a specific day
   */
  private generateDaySlots(date: Date, duration: number, interval: number): TimeSlot[] {
    const slots: TimeSlot[] = []
    const dayStart = new Date(date)
    dayStart.setHours(9, 0, 0, 0) // Default start at 9 AM

    const dayEnd = new Date(date)
    dayEnd.setHours(17, 0, 0, 0) // Default end at 5 PM

    let current = new Date(dayStart)

    while (current.getTime() + duration * 60 * 1000 <= dayEnd.getTime()) {
      const slotEnd = addMinutes(current, duration)
      const validation = this.validateBookingInternal(current, duration)

      slots.push({
        start: new Date(current),
        end: slotEnd,
        available: validation.valid,
        conflictReason: validation.violations.length > 0
          ? validation.violations[0].description
          : undefined
      })

      current = addMinutes(current, interval)
    }

    return slots
  }

  /**
   * Update the rule engine with new rules or meetings
   */
  updateRules(newRules: SchedulingRule[]) {
    this.rules = newRules.filter(rule => rule.enabled)
  }

  updateMeetings(newMeetings: Meeting[]) {
    this.existingMeetings = newMeetings
  }

  /**
   * Get a summary of active rules
   */
  getActiveRulesDescription(): string {
    if (this.rules.length === 0) {
      return 'No scheduling rules are currently active.'
    }

    const descriptions = this.rules.map(rule => rule.naturalLanguage)
    return `Active rules: ${descriptions.join(', ')}.`
  }
}
