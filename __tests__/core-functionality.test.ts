/**
 * Core Functionality Tests - Simplified and Focused
 * Tests the essential features without complex mocking
 */

import { SchedulingRuleEngine, type SchedulingRule } from '../lib/scheduling/rule-engine'
import { EmailService } from '../lib/notifications/email-service'
import { addDays, addHours, addMinutes } from 'date-fns'

describe('AI Meeting Scheduler - Core Functionality', () => {
  
  describe('SchedulingRuleEngine', () => {
    let ruleEngine: SchedulingRuleEngine
    let baseDate: Date

    beforeEach(() => {
      baseDate = new Date(2024, 0, 15, 10, 0, 0) // Monday at 10:00 AM
      
      const rules: SchedulingRule[] = [
        {
          id: 'weekdays-only',
          type: 'weekdays',
          enabled: true,
          description: 'Weekdays Only',
          naturalLanguage: 'Only allow meetings on weekdays (Monday to Friday)',
          config: { allowedDays: [1, 2, 3, 4, 5] }
        },
        {
          id: 'business-hours',
          type: 'timeRange',
          enabled: true,
          description: 'Business Hours',
          naturalLanguage: 'Only allow meetings during business hours (9 AM to 5 PM)',
          config: { startTime: '09:00', endTime: '17:00' }
        }
      ]

      const existingMeetings = [
        {
          id: 'existing-1',
          title: 'Existing Meeting',
          duration: 30,
          start: new Date(2024, 0, 15, 9, 0, 0),
          end: new Date(2024, 0, 15, 9, 30, 0),
          attendeeEmail: 'test@example.com',
          type: 'video' as const,
          status: 'confirmed' as const
        }
      ]

      ruleEngine = new SchedulingRuleEngine(rules, existingMeetings)
    })

    test('should validate successful weekday booking', () => {
      const result = ruleEngine.validateBooking(baseDate, 30)
      expect(result.valid).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    test('should reject weekend bookings', () => {
      const saturday = new Date(2024, 0, 13, 10, 0, 0) // Saturday
      const result = ruleEngine.validateBooking(saturday, 30)
      expect(result.valid).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
    })

    test('should reject bookings outside business hours', () => {
      const earlyMorning = new Date(2024, 0, 15, 7, 0, 0) // 7:00 AM
      const result = ruleEngine.validateBooking(earlyMorning, 30)
      expect(result.valid).toBe(false)
    })

    test('should provide alternative suggestions when booking fails', () => {
      const saturday = new Date(2024, 0, 13, 10, 0, 0) // Saturday
      const result = ruleEngine.validateBooking(saturday, 30)
      expect(result.valid).toBe(false)
      expect(result.suggestions).toBeDefined()
      expect(result.suggestions!.length).toBeGreaterThan(0)
    })

    test('should generate available time slots', () => {
      const startDate = new Date(2024, 0, 15) // Monday
      const endDate = addDays(startDate, 2) // Wednesday
      const slots = ruleEngine.generateAvailableSlots(startDate, endDate, 30)
      
      expect(slots.length).toBeGreaterThan(0)
      slots.forEach(slot => {
        const dayOfWeek = slot.start.getDay()
        expect([1, 2, 3, 4, 5]).toContain(dayOfWeek) // Weekdays only
      })
    })

    test('should update rules and re-validate', () => {
      const newRules: SchedulingRule[] = [
        {
          id: 'strict-hours',
          type: 'timeRange',
          enabled: true,
          description: 'Strict Hours',
          naturalLanguage: 'Only allow meetings during strict hours (10 AM to 4 PM)',
          config: { startTime: '10:00', endTime: '16:00' }
        }
      ]

      ruleEngine.updateRules(newRules)
      
      // 9:30 AM should now be invalid (before 10:00 AM)
      const earlyTime = new Date(2024, 0, 15, 9, 30, 0)
      const result = ruleEngine.validateBooking(earlyTime, 30)
      expect(result.valid).toBe(false)
    })
  })

  describe('EmailService', () => {
    let emailService: EmailService
    let mockMeeting: any

    beforeEach(() => {
      emailService = new EmailService('test_key', 'test@example.com', 'Test Scheduler')
      mockMeeting = {
        id: 'test-123',
        title: 'Test Meeting',
        description: 'Test description',
        start: new Date(2024, 0, 15, 14, 0, 0),
        end: new Date(2024, 0, 15, 15, 0, 0),
        attendeeName: 'John Doe',
        attendeeEmail: 'john@example.com',
        hostName: 'Jane Smith',
        hostEmail: 'jane@example.com',
        meetingType: 'video',
        meetingUrl: 'https://example.com/meet'
      }
    })

    test('should send booking confirmation', async () => {
      const result = await emailService.sendBookingConfirmation(mockMeeting)
      expect(result).toBe(true)
    })

    test('should send booking reminder', async () => {
      const result = await emailService.sendBookingReminder(mockMeeting, 15)
      expect(result).toBe(true)
    })

    test('should send cancellation notification', async () => {
      const result = await emailService.sendBookingCancellation(mockMeeting)
      expect(result).toBe(true)
    })

    test('should handle rescheduling notifications', async () => {
      const newMeeting = {
        ...mockMeeting,
        start: addHours(mockMeeting.start, 2),
        end: addHours(mockMeeting.end, 2)
      }
      const result = await emailService.sendBookingRescheduled(mockMeeting, newMeeting)
      expect(result).toBe(true)
    })

    test('should schedule future reminders', async () => {
      const futureMeeting = {
        ...mockMeeting,
        start: addHours(new Date(), 2),
        end: addHours(new Date(), 3)
      }
      const result = await emailService.scheduleReminder(futureMeeting, 15)
      expect(result).toBe(true)
    })
  })



  describe('Performance Tests', () => {
    test('rule engine should validate quickly', () => {
      const rules: SchedulingRule[] = [
        {
          id: 'weekdays-only',
          type: 'weekdays',
          enabled: true,
          description: 'Allow bookings only on weekdays',
          naturalLanguage: 'Meetings can only be scheduled Monday through Friday',
          config: { allowedDays: [1, 2, 3, 4, 5] }
        }
      ]

      const ruleEngine = new SchedulingRuleEngine(rules, [])
      const start = performance.now()

      for (let i = 0; i < 50; i++) {
        const testDate = addMinutes(new Date(), i * 30)
        ruleEngine.validateBooking(testDate, 30)
      }

      const end = performance.now()
      const duration = end - start

      // Should complete 50 validations quickly
      expect(duration).toBeLessThan(100)
    })

    test('email service should handle multiple sends efficiently', async () => {
      const emailService = new EmailService('test', 'test@example.com', 'Test')
      const mockMeeting = {
        id: 'perf-test',
        title: 'Performance Test',
        description: 'Testing performance',
        start: new Date(),
        end: addHours(new Date(), 1),
        attendeeName: 'Test User',
        attendeeEmail: 'test@example.com',
        hostName: 'Host',
        hostEmail: 'host@example.com',
        meetingType: 'video' as const,
        meetingUrl: 'https://example.com'
      }

      const start = performance.now()

      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(emailService.sendBookingConfirmation({
          ...mockMeeting,
          id: `perf-test-${i}`,
          attendeeEmail: `test${i}@example.com`
        }))
      }

      const results = await Promise.all(promises)
      const end = performance.now()
      const duration = end - start

      // All should succeed
      results.forEach(result => expect(result).toBe(true))
      
      // Should complete efficiently
      expect(duration).toBeLessThan(2000)
    })


  })

  describe('Integration Tests', () => {
    test('complete booking flow should work end-to-end', async () => {
      // Set up services
      const ruleEngine = new SchedulingRuleEngine([
        {
          id: 'weekdays-only',
          type: 'weekdays',
          enabled: true,
          description: 'Allow bookings only on weekdays',
          naturalLanguage: 'Meetings can only be scheduled Monday through Friday',
          config: { allowedDays: [1, 2, 3, 4, 5] }
        }
      ], [])

      const emailService = new EmailService('test', 'test@example.com', 'Test')

      // Test booking data
      const bookingDate = new Date(2024, 0, 15, 14, 0, 0) // Monday 2 PM
      const meetingData = {
        id: 'integration-test',
        title: 'Integration Test Meeting',
        description: 'Testing the complete flow',
        start: bookingDate,
        end: addMinutes(bookingDate, 30),
        attendeeName: 'John Doe',
        attendeeEmail: 'john@example.com',
        hostName: 'Jane Smith',
        hostEmail: 'jane@example.com',
        meetingType: 'video' as const,
        meetingUrl: 'https://example.com/meet'
      }

      // Step 1: Validate against rules
      const validation = ruleEngine.validateBooking(bookingDate, 30)
      expect(validation.valid).toBe(true)

      // Step 2: Send email confirmation
      const emailResult = await emailService.sendBookingConfirmation(meetingData)
      expect(emailResult).toBe(true)

      // Complete flow should work without errors
      expect(true).toBe(true)
    })

    test('should handle booking conflicts gracefully', async () => {
      const existingMeeting = {
        id: 'existing',
        title: 'Existing Meeting',
        start: new Date(2024, 0, 15, 14, 0, 0),
        end: new Date(2024, 0, 15, 14, 30, 0),
        duration: 30,
        attendeeEmail: 'existing@example.com',
        type: 'video' as const,
        status: 'confirmed' as const
      }

      const ruleEngine = new SchedulingRuleEngine([
        {
          id: 'buffer-time',
          type: 'buffer',
          enabled: true,
          description: 'Buffer Time',
          naturalLanguage: 'Require 15-minute buffer between meetings',
          config: { bufferMinutes: 15 }
        }
      ], [existingMeeting])

      // Try to book too close to existing meeting
      const conflictingDate = new Date(2024, 0, 15, 14, 35, 0) // 5 minutes after existing
      const validation = ruleEngine.validateBooking(conflictingDate, 30)

      expect(validation.valid).toBe(false)
      expect(validation.suggestions).toBeDefined()
      expect(validation.suggestions!.length).toBeGreaterThan(0)

      // Suggestions should avoid conflicts
      validation.suggestions!.forEach(suggestion => {
        const newValidation = ruleEngine.validateBooking(suggestion, 30)
        expect(newValidation.valid).toBe(true)
      })
    })
  })
})
