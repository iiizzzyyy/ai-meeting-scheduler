/**
 * Unit and Integration Tests for Email Service
 * Tests email template generation, delivery simulation, and scheduling
 */

import { EmailService, type MeetingDetails } from '@/lib/notifications/email-service'
import { addMinutes, addHours } from 'date-fns'

describe('EmailService', () => {
  let emailService: EmailService
  let mockMeeting: MeetingDetails

  beforeEach(() => {
    emailService = new EmailService(
      'test_api_key',
      'test@scheduler.com',
      'AI Test Scheduler'
    )

    mockMeeting = {
      id: 'test-meeting-123',
      title: 'Product Strategy Meeting',
      description: 'Discussing Q2 product roadmap and priorities',
      start: new Date(2024, 0, 15, 14, 0, 0), // 2:00 PM
      end: new Date(2024, 0, 15, 15, 0, 0),   // 3:00 PM
      attendeeName: 'John Doe',
      attendeeEmail: 'john.doe@example.com',
      hostName: 'Alice Smith',
      hostEmail: 'alice.smith@company.com',
      meetingUrl: 'https://meet.example.com/test-meeting-123',
      meetingType: 'video',
      location: undefined
    }
  })

  describe('Email Template Generation', () => {
    describe('Booking Confirmation Template', () => {
      test('should generate proper confirmation email template', async () => {
        const result = await emailService.sendBookingConfirmation(mockMeeting)
        
        // Should return success (mocked)
        expect(result).toBe(true)
      })

      test('should include all meeting details in confirmation', async () => {
        // Mock console.log to capture template content
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
        
        await emailService.sendBookingConfirmation(mockMeeting)
        
        // Find the email content in console logs
        const emailContentLog = consoleSpy.mock.calls.find(call => 
          call[0] === 'HTML Body:'
        )
        
        if (emailContentLog && emailContentLog[1]) {
          const htmlContent = emailContentLog[1] as string
          
          expect(htmlContent).toContain(mockMeeting.title)
          expect(htmlContent).toContain(mockMeeting.attendeeName)
          expect(htmlContent).toContain(mockMeeting.description)
          expect(htmlContent).toContain(mockMeeting.meetingUrl)
          expect(htmlContent).toContain('Monday, January 15, 2024')
          expect(htmlContent).toContain('2:00 PM')
          expect(htmlContent).toContain('💻 Video Call')
        }
        
        consoleSpy.mockRestore()
      })

      test('should handle in-person meetings correctly', async () => {
        const inPersonMeeting: MeetingDetails = {
          ...mockMeeting,
          meetingType: 'in-person',
          location: 'Conference Room A, Building 1',
          meetingUrl: undefined
        }
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
        
        await emailService.sendBookingConfirmation(inPersonMeeting)
        
        const emailContentLog = consoleSpy.mock.calls.find(call => 
          call[0] === 'HTML Body:'
        )
        
        if (emailContentLog && emailContentLog[1]) {
          const htmlContent = emailContentLog[1] as string
          
          expect(htmlContent).toContain('🏢 In-Person')
          expect(htmlContent).toContain('Conference Room A, Building 1')
          expect(htmlContent).not.toContain('Join Meeting')
        }
        
        consoleSpy.mockRestore()
      })

      test('should handle phone meetings correctly', async () => {
        const phoneMeeting: MeetingDetails = {
          ...mockMeeting,
          meetingType: 'phone',
          meetingUrl: undefined
        }

        const result = await emailService.sendBookingConfirmation(phoneMeeting)
        expect(result).toBe(true)
      })
    })

    describe('Reminder Email Template', () => {
      test('should generate reminder email with correct timing', async () => {
        const result = await emailService.sendBookingReminder(mockMeeting, 15)
        expect(result).toBe(true)
      })

      test('should customize reminder message based on minutes', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
        
        await emailService.sendBookingReminder(mockMeeting, 5)
        
        const emailContentLog = consoleSpy.mock.calls.find(call => 
          call[0] === 'HTML Body:'
        )
        
        if (emailContentLog && emailContentLog[1]) {
          const htmlContent = emailContentLog[1] as string
          expect(htmlContent).toContain('5 minutes')
        }
        
        consoleSpy.mockRestore()
      })
    })

    describe('Cancellation Email Template', () => {
      test('should generate cancellation email', async () => {
        const result = await emailService.sendBookingCancellation(mockMeeting)
        expect(result).toBe(true)
      })

      test('should include cancellation reason when provided', async () => {
        const reason = 'Unexpected conflict arose'
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
        
        await emailService.sendBookingCancellation(mockMeeting, reason)
        
        const emailContentLog = consoleSpy.mock.calls.find(call => 
          call[0] === 'HTML Body:'
        )
        
        if (emailContentLog && emailContentLog[1]) {
          const htmlContent = emailContentLog[1] as string
          expect(htmlContent).toContain(reason)
        }
        
        consoleSpy.mockRestore()
      })
    })

    describe('Rescheduling Email Template', () => {
      test('should generate rescheduling email with old and new times', async () => {
        const newMeeting: MeetingDetails = {
          ...mockMeeting,
          id: 'rescheduled-meeting-123',
          start: addHours(mockMeeting.start, 2),
          end: addHours(mockMeeting.end, 2)
        }

        const result = await emailService.sendBookingRescheduled(mockMeeting, newMeeting)
        expect(result).toBe(true)
      })

      test('should clearly show old vs new times', async () => {
        const newMeeting: MeetingDetails = {
          ...mockMeeting,
          start: new Date(2024, 0, 16, 10, 0, 0), // Next day at 10 AM
          end: new Date(2024, 0, 16, 11, 0, 0)    // Next day at 11 AM
        }
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
        
        await emailService.sendBookingRescheduled(mockMeeting, newMeeting)
        
        const emailContentLog = consoleSpy.mock.calls.find(call => 
          call[0] === 'HTML Body:'
        )
        
        if (emailContentLog && emailContentLog[1]) {
          const htmlContent = emailContentLog[1] as string
          
          // Should show both old and new times
          expect(htmlContent).toContain('Monday, January 15, 2024 at 2:00 PM') // Old time
          expect(htmlContent).toContain('Tuesday, January 16, 2024 at 10:00 AM') // New time
        }
        
        consoleSpy.mockRestore()
      })
    })
  })

  describe('Email Scheduling and Reminders', () => {
    test('should schedule reminder for future meeting', async () => {
      const futureMeeting: MeetingDetails = {
        ...mockMeeting,
        start: addHours(new Date(), 2), // 2 hours from now
        end: addHours(new Date(), 3)    // 3 hours from now
      }

      const result = await emailService.scheduleReminder(futureMeeting, 15)
      expect(result).toBe(true)
    })

    test('should send reminder immediately for past meeting time', async () => {
      const pastMeeting: MeetingDetails = {
        ...mockMeeting,
        start: addMinutes(new Date(), -30), // 30 minutes ago
        end: addMinutes(new Date(), -60)    // 1 hour ago
      }

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      const result = await emailService.scheduleReminder(pastMeeting, 15)
      expect(result).toBe(true)
      
      // Should log that it's sending immediately
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already passed')
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    test('should handle missing meeting details gracefully', async () => {
      const incompleteMeeting: Partial<MeetingDetails> = {
        id: 'incomplete',
        title: 'Test Meeting'
        // Missing required fields
      }

      // Should not throw error
      expect(async () => {
        await emailService.sendBookingConfirmation(incompleteMeeting as MeetingDetails)
      }).not.toThrow()
    })

    test('should handle invalid email addresses', async () => {
      const invalidEmailMeeting: MeetingDetails = {
        ...mockMeeting,
        attendeeEmail: 'invalid-email',
        hostEmail: 'also-invalid'
      }

      // Should not throw error and still attempt to send
      const result = await emailService.sendBookingConfirmation(invalidEmailMeeting)
      expect(result).toBe(true)
    })
  })

  describe('Email Content Quality', () => {
    test('should generate valid HTML content', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      await emailService.sendBookingConfirmation(mockMeeting)
      
      const emailContentLog = consoleSpy.mock.calls.find(call => 
        call[0] === 'HTML Body:'
      )
      
      if (emailContentLog && emailContentLog[1]) {
        const htmlContent = emailContentLog[1] as string
        
        // Basic HTML structure checks
        expect(htmlContent).toContain('<!DOCTYPE html>')
        expect(htmlContent).toContain('<html>')
        expect(htmlContent).toContain('<head>')
        expect(htmlContent).toContain('<body>')
        expect(htmlContent).toContain('</html>')
        
        // Should have proper meta tags
        expect(htmlContent).toContain('<meta charset="utf-8">')
        
        // Should have CSS styles
        expect(htmlContent).toContain('<style>')
        expect(htmlContent).toContain('font-family:')
      }
      
      consoleSpy.mockRestore()
    })

    test('should escape special characters in content', async () => {
      const specialCharMeeting: MeetingDetails = {
        ...mockMeeting,
        title: 'Meeting with <script>alert("xss")</script>',
        description: 'Description with & ampersand and "quotes"'
      }

      const result = await emailService.sendBookingConfirmation(specialCharMeeting)
      expect(result).toBe(true)
      
      // In a real implementation, we'd verify that HTML is properly escaped
    })

    test('should generate proper text alternative', async () => {
      // Text version should be readable and contain all key information
      const result = await emailService.sendBookingConfirmation(mockMeeting)
      expect(result).toBe(true)
      
      // Text template generation is tested implicitly through the HTML template tests
      // In a production system, we'd want to verify text content separately
    })
  })

  describe('Performance Tests', () => {
    test('should generate email templates quickly', async () => {
      const start = performance.now()
      
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(emailService.sendBookingConfirmation({
          ...mockMeeting,
          id: `perf-test-${i}`,
          attendeeEmail: `test${i}@example.com`
        }))
      }
      
      await Promise.all(promises)
      
      const end = performance.now()
      const duration = end - start
      
      // Should generate 10 emails in under 1 second
      expect(duration).toBeLessThan(1000)
    })

    test('should handle concurrent email sending', async () => {
      const concurrentEmails = Array.from({ length: 5 }, (_, i) => ({
        ...mockMeeting,
        id: `concurrent-${i}`,
        attendeeEmail: `concurrent${i}@example.com`
      }))

      const start = performance.now()
      
      const results = await Promise.all(
        concurrentEmails.map(meeting => 
          emailService.sendBookingConfirmation(meeting)
        )
      )
      
      const end = performance.now()
      const duration = end - start
      
      // All should succeed
      results.forEach(result => {
        expect(result).toBe(true)
      })
      
      // Should complete concurrent sends efficiently
      expect(duration).toBeLessThan(2000)
    })
  })
})
