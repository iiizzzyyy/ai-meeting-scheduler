/**
 * Unit Tests for Scheduling Rule Engine
 * Tests rule validation, constraint enforcement, and alternative suggestions
 */

import { SchedulingRuleEngine, type SchedulingRule } from '@/lib/scheduling/rule-engine'
import { addDays, addHours, addMinutes, setHours, setMinutes } from 'date-fns'

describe('SchedulingRuleEngine', () => {
  let ruleEngine: SchedulingRuleEngine
  let baseDate: Date
  let existingMeetings: any[]

  beforeEach(() => {
    // Set up base date for consistent testing (Monday at 10:00 AM)
    baseDate = new Date(2024, 0, 15, 10, 0, 0) // January 15, 2024, 10:00 AM
    
    existingMeetings = [
      {
        id: 'existing-1',
        start: new Date(2024, 0, 15, 9, 0, 0), // 9:00 AM same day
        end: new Date(2024, 0, 15, 9, 30, 0),   // 9:30 AM same day
        attendeeEmail: 'test@example.com'
      },
      {
        id: 'existing-2',
        start: new Date(2024, 0, 15, 14, 0, 0), // 2:00 PM same day
        end: new Date(2024, 0, 15, 15, 0, 0),   // 3:00 PM same day
        attendeeEmail: 'other@example.com'
      }
    ]

    const defaultRules: SchedulingRule[] = [
      {
        id: 'weekdays-only',
        type: 'weekdays',
        enabled: true,
        description: 'Allow bookings only on weekdays',
        naturalLanguage: 'Meetings can only be scheduled Monday through Friday',
        config: {
          allowedDays: [1, 2, 3, 4, 5] // Monday to Friday
        }
      },
      {
        id: 'business-hours',
        type: 'timeRange',
        enabled: true,
        description: 'Limit bookings to business hours',
        naturalLanguage: 'Meetings can only be scheduled between 9 AM and 5 PM',
        config: {
          startTime: '09:00',
          endTime: '17:00'
        }
      },
      {
        id: 'buffer-time',
        type: 'buffer',
        enabled: true,
        description: 'Require buffer time between meetings',
        naturalLanguage: 'Meetings must have at least 15 minutes buffer time between them',
        config: {
          bufferMinutes: 15
        }
      }
    ]

    ruleEngine = new SchedulingRuleEngine(defaultRules, existingMeetings)
  })

  describe('Rule Validation', () => {
    test('should validate successful booking within business hours on weekday', () => {
      const result = ruleEngine.validateBooking(baseDate, 30)
      
      expect(result.valid).toBe(true)
      expect(result.violations).toHaveLength(0)
      expect(result.score).toBeGreaterThan(80)
    })

    test('should reject booking on weekend', () => {
      const saturday = new Date(2024, 0, 13, 10, 0, 0) // Saturday
      const result = ruleEngine.validateBooking(saturday, 30)
      
      expect(result.valid).toBe(false)
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          ruleId: 'weekdays-only',
          severity: 'error',
          description: expect.stringContaining('weekend')
        })
      )
    })

    test('should reject booking outside business hours', () => {
      const earlyMorning = setHours(setMinutes(baseDate, 0), 7) // 7:00 AM
      const result = ruleEngine.validateBooking(earlyMorning, 30)
      
      expect(result.valid).toBe(false)
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          ruleId: 'business-hours',
          severity: 'error',
          description: expect.stringContaining('business hours')
        })
      )
    })

    test('should reject booking too close to existing meeting', () => {
      // Try to book at 9:35 AM, which is only 5 minutes after existing 9:30 AM meeting
      const tooClose = new Date(2024, 0, 15, 9, 35, 0)
      const result = ruleEngine.validateBooking(tooClose, 30)
      
      expect(result.valid).toBe(false)
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          ruleId: 'buffer-time',
          severity: 'error',
          description: expect.stringContaining('buffer')
        })
      )
    })

    test('should handle overlapping meetings', () => {
      // Try to book at 9:15 AM, which overlaps with 9:00-9:30 AM meeting
      const overlapping = new Date(2024, 0, 15, 9, 15, 0)
      const result = ruleEngine.validateBooking(overlapping, 30)
      
      expect(result.valid).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
    })
  })

  describe('Holiday Restrictions', () => {
    test('should reject booking on Swedish national holiday', () => {
      // Test New Year's Day
      const newYearsDay = new Date(2024, 0, 1, 10, 0, 0) // January 1, 2024 (Monday)
      const result = ruleEngine.validateBooking(newYearsDay, 30)
      
      expect(result.valid).toBe(false)
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          severity: 'error',
          description: expect.stringContaining('holiday')
        })
      )
    })

    test('should accept booking on regular working day', () => {
      const regularDay = new Date(2024, 0, 16, 10, 0, 0) // January 16, 2024 (Tuesday)
      const result = ruleEngine.validateBooking(regularDay, 30)
      
      expect(result.valid).toBe(true)
    })
  })

  describe('Maximum Meetings Per Day', () => {
    test('should enforce max meetings per day limit', () => {
      const rules: SchedulingRule[] = [
        {
          id: 'max-meetings',
          type: 'maxMeetings',
          enabled: true,
          description: 'Max 2 Meetings Per Day',
          naturalLanguage: 'Maximum 2 meetings per day',
          config: {
            maxMeetings: 2
          }
        }
      ]

      const manyMeetings = [
        { 
          id: '1', 
          start: new Date(2024, 0, 15, 9, 0, 0), 
          end: new Date(2024, 0, 15, 9, 30, 0), 
          attendeeEmail: 'user1@example.com',
          title: 'Meeting 1',
          duration: 30,
          type: 'video' as const,
          status: 'confirmed' as const
        },
        { 
          id: '2', 
          start: new Date(2024, 0, 15, 11, 0, 0), 
          end: new Date(2024, 0, 15, 11, 30, 0), 
          attendeeEmail: 'user2@example.com',
          title: 'Meeting 2',
          duration: 30,
          type: 'video' as const,
          status: 'confirmed' as const
        }
      ]

      const restrictiveEngine = new SchedulingRuleEngine(rules, manyMeetings)
      
      // Try to book a third meeting on the same day
      const thirdMeeting = new Date(2024, 0, 15, 13, 0, 0)
      const result = restrictiveEngine.validateBooking(thirdMeeting, 30)
      
      expect(result.valid).toBe(false)
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          ruleId: 'max-meetings',
          severity: 'error',
          description: expect.stringContaining('maximum')
        })
      )
    })
  })

  describe('Duration Restrictions', () => {
    test('should enforce maximum duration limit', () => {
      const rules: SchedulingRule[] = [
        {
          id: 'max-duration',
          type: 'duration',
          enabled: true,
          description: 'Max 45 Minutes',
          naturalLanguage: 'Maximum 45 minutes duration',
          config: {
            maxDurationMinutes: 45
          }
        }
      ]

      const durationEngine = new SchedulingRuleEngine(rules, [])
      
      const result = durationEngine.validateBooking(baseDate, 60) // 60 minutes
      
      expect(result.valid).toBe(false)
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          ruleId: 'max-duration',
          severity: 'error',
          description: expect.stringContaining('duration')
        })
      )
    })

    test('should allow meetings within duration limit', () => {
      const rules: SchedulingRule[] = [
        {
          id: 'max-duration',
          type: 'duration',
          enabled: true,
          description: 'Max 45 Minutes',
          naturalLanguage: 'Maximum 45 minutes duration',
          config: {
            maxDurationMinutes: 45
          }
        }
      ]

      const durationEngine = new SchedulingRuleEngine(rules, [])
      
      const result = durationEngine.validateBooking(baseDate, 30) // 30 minutes
      
      expect(result.valid).toBe(true)
    })
  })

  describe('Custom Rules', () => {
    test('should handle custom text-based rules', () => {
      const rules: SchedulingRule[] = [
        {
          id: 'custom-rule',
          type: 'custom',
          enabled: true,
          description: 'No Friday Afternoon Meetings',
          naturalLanguage: 'No meetings on Friday after 2 PM',
          config: {
            description: 'No meetings on Friday after 2 PM'
          }
        }
      ]

      const customEngine = new SchedulingRuleEngine(rules, [])
      
      // Test Friday afternoon booking
      const fridayAfternoon = new Date(2024, 0, 19, 15, 0, 0) // Friday 3 PM
      const result = customEngine.validateBooking(fridayAfternoon, 30)
      
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          ruleId: 'custom-rule',
          severity: 'warning',
          description: expect.stringContaining('Friday')
        })
      )
    })
  })

  describe('Alternative Time Suggestions', () => {
    test('should provide alternative time suggestions when booking fails', () => {
      // Try to book on weekend (should fail and provide alternatives)
      const saturday = new Date(2024, 0, 13, 10, 0, 0)
      const result = ruleEngine.validateBooking(saturday, 30)
      
      expect(result.valid).toBe(false)
      expect(result.suggestions).toBeDefined()
      expect(result.suggestions!.length).toBeGreaterThan(0)
      
      // All suggestions should be valid weekdays
      result.suggestions!.forEach(suggestion => {
        const dayOfWeek = suggestion.getDay()
        expect([1, 2, 3, 4, 5]).toContain(dayOfWeek) // Monday to Friday
      })
    })

    test('should provide suggestions that avoid conflicts', () => {
      // Try to book at a conflicting time
      const conflicting = new Date(2024, 0, 15, 9, 15, 0) // Overlaps with 9:00-9:30 meeting
      const result = ruleEngine.validateBooking(conflicting, 30)
      
      expect(result.valid).toBe(false)
      expect(result.suggestions).toBeDefined()
      expect(result.suggestions!.length).toBeGreaterThan(0)
    })
  })

  describe('Available Time Slots Generation', () => {
    test('should generate available time slots for date range', () => {
      const startDate = new Date(2024, 0, 15) // Monday
      const endDate = addDays(startDate, 2) // Wednesday
      
      const slots = ruleEngine.generateAvailableSlots(startDate, endDate, 30)
      
      expect(slots.length).toBeGreaterThan(0)
      
      // All slots should be within business hours and on weekdays
      slots.forEach(slot => {
        const dayOfWeek = slot.start.getDay()
        const hour = slot.start.getHours()
        
        expect([1, 2, 3, 4, 5]).toContain(dayOfWeek) // Weekdays only
        expect(hour).toBeGreaterThanOrEqual(9) // After 9 AM
        expect(hour).toBeLessThan(17) // Before 5 PM
      })
    })

    test('should exclude existing meetings from available slots', () => {
      const startDate = new Date(2024, 0, 15) // Same day as existing meetings
      const endDate = startDate
      
      const slots = ruleEngine.generateAvailableSlots(startDate, endDate, 30)
      
      // Should not have slots that overlap with existing meetings
      const conflictingSlots = slots.filter(slot => {
        return existingMeetings.some(meeting => {
          return (slot.start < meeting.end && slot.end > meeting.start)
        })
      })
      
      expect(conflictingSlots).toHaveLength(0)
    })
  })

  describe('Rule Management', () => {
    test('should update rules and re-validate', () => {
      const newRules: SchedulingRule[] = [
        {
          id: 'strict-hours',
          type: 'timeRange',
          enabled: true,
          description: 'Strict Hours',
          naturalLanguage: '10 AM to 4 PM strict hours',
          config: {
            startTime: '10:00',
            endTime: '16:00'
          }
        }
      ]

      ruleEngine.updateRules(newRules)
      
      // 9:30 AM should now be invalid (before 10:00 AM)
      const earlyTime = new Date(2024, 0, 15, 9, 30, 0)
      const result = ruleEngine.validateBooking(earlyTime, 30)
      
      expect(result.valid).toBe(false)
    })

    // test('should provide active rules summary', () => {
    //   const summary = ruleEngine.getActiveRulesSummary()
    //   
    //   expect(summary).toContain('Weekdays Only')
    //   expect(summary).toContain('Business Hours')
    //   expect(summary).toContain('Buffer Time')
    // })
  })

  describe('Performance', () => {
    test('should validate booking quickly', () => {
      const start = performance.now()
      
      for (let i = 0; i < 100; i++) {
        const testDate = addMinutes(baseDate, i * 30)
        ruleEngine.validateBooking(testDate, 30)
      }
      
      const end = performance.now()
      const duration = end - start
      
      // Should complete 100 validations in under 100ms
      expect(duration).toBeLessThan(100)
    })

    test('should generate slots for large date ranges efficiently', () => {
      const start = performance.now()
      
      const startDate = new Date(2024, 0, 1)
      const endDate = addDays(startDate, 30) // One month
      
      const slots = ruleEngine.generateAvailableSlots(startDate, endDate, 30)
      
      const end = performance.now()
      const duration = end - start
      
      expect(slots.length).toBeGreaterThan(0)
      // Should generate slots for a month in under 500ms
      expect(duration).toBeLessThan(500)
    })
  })

  describe('Edge Cases', () => {
    test('should handle invalid date inputs gracefully', () => {
      const invalidDate = new Date('invalid')
      const result = ruleEngine.validateBooking(invalidDate, 30)
      
      expect(result.valid).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
    })

    test('should handle zero duration meetings', () => {
      const result = ruleEngine.validateBooking(baseDate, 0)
      
      expect(result.valid).toBe(false)
    })

    test('should handle very long duration meetings', () => {
      const result = ruleEngine.validateBooking(baseDate, 480) // 8 hours
      
      // Should likely fail due to business hours constraints
      expect(result.valid).toBe(false)
    })

    test('should handle empty rules list', () => {
      const emptyRulesEngine = new SchedulingRuleEngine([], [])
      const result = emptyRulesEngine.validateBooking(baseDate, 30)
      
      // With no rules, booking should be valid
      expect(result.valid).toBe(true)
    })
  })
})
