/**
 * UI Component Tests for Meeting Booking Modal
 * Tests user interactions, form validation, and integration with services
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MeetingBookingModal from '@/components/meetings/meeting-booking-modal'
import type { SchedulingRule } from '@/lib/scheduling/rule-engine'

// Mock the services
jest.mock('@/lib/notifications/email-service', () => ({
  emailService: {
    sendBookingConfirmation: jest.fn().mockResolvedValue(true),
    scheduleReminder: jest.fn().mockResolvedValue(true)
  }
}))

jest.mock('@/lib/notifications/calendar-sync-service', () => ({
  calendarSyncService: {
    addProvider: jest.fn(),
    createCalendarEvent: jest.fn().mockResolvedValue('event_123'),
    generateICalFile: jest.fn().mockReturnValue('BEGIN:VCALENDAR...')
  }
}))

// Mock date-fns functions
jest.mock('date-fns', () => ({
  addMinutes: jest.fn((date, minutes) => new Date(date.getTime() + minutes * 60000)),
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'EEEE, MMMM d, yyyy') return 'Monday, January 15, 2024'
    if (formatStr === 'h:mm a') return '2:00 PM'
    return date.toISOString()
  })
}))

describe('MeetingBookingModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    selectedDate: new Date(2024, 0, 15, 14, 0, 0), // January 15, 2024, 2:00 PM
    selectedTime: '14:00',
    onBookingComplete: jest.fn()
  }

  const mockRules: SchedulingRule[] = [
    {
      id: 'weekdays-only',
      type: 'weekdays',
      enabled: true,
      description: 'Weekdays Only',
      naturalLanguage: 'Only allow meetings on weekdays',
      config: { allowedDays: [1, 2, 3, 4, 5] }
    },
    {
      id: 'business-hours',
      type: 'timeRange',
      enabled: true,
      description: 'Business Hours',
      naturalLanguage: '9 AM to 5 PM business hours',
      config: { startTime: '09:00', endTime: '17:00' }
    }
  ]

  const mockExistingMeetings = [
    {
      id: 'existing-1',
      start: new Date(2024, 0, 15, 9, 0, 0),
      end: new Date(2024, 0, 15, 9, 30, 0),
      attendeeEmail: 'test@example.com'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering and Initial State', () => {
    test('should render modal when open', () => {
      render(<MeetingBookingModal {...defaultProps} />)
      
      expect(screen.getByText('Book Meeting')).toBeInTheDocument()
      expect(screen.getByLabelText(/meeting title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/attendee name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/attendee email/i)).toBeInTheDocument()
    })

    test('should not render modal when closed', () => {
      render(<MeetingBookingModal {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByText('Book Meeting')).not.toBeInTheDocument()
    })

    test('should display selected date and time', () => {
      render(<MeetingBookingModal {...defaultProps} />)
      
      expect(screen.getByText('Monday, January 15, 2024')).toBeInTheDocument()
      expect(screen.getByText('2:00 PM')).toBeInTheDocument()
    })

    test('should show default duration of 30 minutes', () => {
      render(<MeetingBookingModal {...defaultProps} />)
      
      const durationSelect = screen.getByDisplayValue('30 minutes')
      expect(durationSelect).toBeInTheDocument()
    })

    test('should show default meeting type as video', () => {
      render(<MeetingBookingModal {...defaultProps} />)
      
      const videoOption = screen.getByDisplayValue('Video Call')
      expect(videoOption).toBeInTheDocument()
    })
  })

  describe('Form Interactions', () => {
    test('should allow typing in meeting title field', async () => {
      const user = userEvent.setup()
      render(<MeetingBookingModal {...defaultProps} />)
      
      const titleInput = screen.getByLabelText(/meeting title/i)
      await user.type(titleInput, 'Project Planning Meeting')
      
      expect(titleInput).toHaveValue('Project Planning Meeting')
    })

    test('should allow typing in description field', async () => {
      const user = userEvent.setup()
      render(<MeetingBookingModal {...defaultProps} />)
      
      const descriptionInput = screen.getByLabelText(/description/i)
      await user.type(descriptionInput, 'Discussing project timeline and deliverables')
      
      expect(descriptionInput).toHaveValue('Discussing project timeline and deliverables')
    })

    test('should allow typing attendee information', async () => {
      const user = userEvent.setup()
      render(<MeetingBookingModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText(/attendee name/i)
      const emailInput = screen.getByLabelText(/attendee email/i)
      
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john.doe@example.com')
      
      expect(nameInput).toHaveValue('John Doe')
      expect(emailInput).toHaveValue('john.doe@example.com')
    })

    test('should allow changing meeting duration', async () => {
      const user = userEvent.setup()
      render(<MeetingBookingModal {...defaultProps} />)
      
      const durationSelect = screen.getByLabelText(/duration/i)
      await user.selectOptions(durationSelect, '60')
      
      expect(durationSelect).toHaveValue('60')
    })

    test('should allow changing meeting type', async () => {
      const user = userEvent.setup()
      render(<MeetingBookingModal {...defaultProps} />)
      
      const typeSelect = screen.getByLabelText(/meeting type/i)
      await user.selectOptions(typeSelect, 'in-person')
      
      expect(typeSelect).toHaveValue('in-person')
    })
  })

  describe('Form Validation', () => {
    test('should show error for empty required fields', async () => {
      const user = userEvent.setup()
      render(<MeetingBookingModal {...defaultProps} />)
      
      const submitButton = screen.getByText('Book Meeting')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please fill in all required fields/i)).toBeInTheDocument()
      })
    })

    test('should show error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<MeetingBookingModal {...defaultProps} />)
      
      // Fill in all fields except valid email
      await user.type(screen.getByLabelText(/meeting title/i), 'Test Meeting')
      await user.type(screen.getByLabelText(/attendee name/i), 'John Doe')
      await user.type(screen.getByLabelText(/attendee email/i), 'invalid-email')
      
      const submitButton = screen.getByText('Book Meeting')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    test('should validate against scheduling rules', async () => {
      const user = userEvent.setup()
      const propsWithRules = {
        ...defaultProps,
        selectedDate: new Date(2024, 0, 13, 14, 0, 0), // Saturday (weekend)
        schedulingRules: mockRules,
        existingMeetings: mockExistingMeetings
      }
      
      render(<MeetingBookingModal {...propsWithRules} />)
      
      // Fill in required fields
      await user.type(screen.getByLabelText(/meeting title/i), 'Test Meeting')
      await user.type(screen.getByLabelText(/attendee name/i), 'John Doe')
      await user.type(screen.getByLabelText(/attendee email/i), 'john.doe@example.com')
      
      const submitButton = screen.getByText('Book Meeting')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/scheduling conflict/i)).toBeInTheDocument()
      })
    })
  })

  describe('Successful Booking Flow', () => {
    test('should complete booking with valid inputs', async () => {
      const user = userEvent.setup()
      const onBookingComplete = jest.fn()
      const onClose = jest.fn()
      
      render(
        <MeetingBookingModal 
          {...defaultProps} 
          onBookingComplete={onBookingComplete}
          onClose={onClose}
        />
      )
      
      // Fill in all required fields
      await user.type(screen.getByLabelText(/meeting title/i), 'Project Review')
      await user.type(screen.getByLabelText(/description/i), 'Weekly project status review')
      await user.type(screen.getByLabelText(/attendee name/i), 'Jane Smith')
      await user.type(screen.getByLabelText(/attendee email/i), 'jane.smith@example.com')
      
      const submitButton = screen.getByText('Book Meeting')
      await user.click(submitButton)
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/booking.../i)).toBeInTheDocument()
      })
      
      // Should complete successfully
      await waitFor(() => {
        expect(onBookingComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Project Review',
            description: 'Weekly project status review',
            attendeeName: 'Jane Smith',
            attendeeEmail: 'jane.smith@example.com'
          })
        )
        expect(onClose).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    test('should send email notifications on successful booking', async () => {
      const user = userEvent.setup()
      const { emailService } = require('@/lib/notifications/email-service')
      
      render(<MeetingBookingModal {...defaultProps} />)
      
      // Fill in required fields
      await user.type(screen.getByLabelText(/meeting title/i), 'Test Meeting')
      await user.type(screen.getByLabelText(/attendee name/i), 'John Doe')
      await user.type(screen.getByLabelText(/attendee email/i), 'john.doe@example.com')
      
      const submitButton = screen.getByText('Book Meeting')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(emailService.sendBookingConfirmation).toHaveBeenCalled()
        expect(emailService.scheduleReminder).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    test('should create calendar event on successful booking', async () => {
      const user = userEvent.setup()
      const { calendarSyncService } = require('@/lib/notifications/calendar-sync-service')
      
      render(<MeetingBookingModal {...defaultProps} />)
      
      // Fill in required fields
      await user.type(screen.getByLabelText(/meeting title/i), 'Test Meeting')
      await user.type(screen.getByLabelText(/attendee name/i), 'John Doe')
      await user.type(screen.getByLabelText(/attendee email/i), 'john.doe@example.com')
      
      const submitButton = screen.getByText('Book Meeting')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(calendarSyncService.addProvider).toHaveBeenCalled()
        expect(calendarSyncService.createCalendarEvent).toHaveBeenCalled()
        expect(calendarSyncService.generateICalFile).toHaveBeenCalled()
      }, { timeout: 3000 })
    })
  })

  describe('Rule Validation Display', () => {
    test('should display scheduling rules summary when provided', () => {
      render(
        <MeetingBookingModal 
          {...defaultProps} 
          schedulingRules={mockRules}
          existingMeetings={mockExistingMeetings}
        />
      )
      
      expect(screen.getByText(/scheduling constraints/i)).toBeInTheDocument()
      expect(screen.getByText(/weekdays only/i)).toBeInTheDocument()
      expect(screen.getByText(/business hours/i)).toBeInTheDocument()
    })

    test('should show validation warnings for potential conflicts', async () => {
      const user = userEvent.setup()
      const propsWithConflicts = {
        ...defaultProps,
        selectedDate: new Date(2024, 0, 15, 16, 45, 0), // 4:45 PM (close to end of business hours)
        schedulingRules: mockRules,
        existingMeetings: mockExistingMeetings
      }
      
      render(<MeetingBookingModal {...propsWithConflicts} />)
      
      // Change duration to 60 minutes (would go past business hours)
      const durationSelect = screen.getByLabelText(/duration/i)
      await user.selectOptions(durationSelect, '60')
      
      // Should show warning about potential conflict
      await waitFor(() => {
        expect(screen.getByText(/may conflict/i) || screen.getByText(/warning/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle email service failures gracefully', async () => {
      const user = userEvent.setup()
      const { emailService } = require('@/lib/notifications/email-service')
      
      // Mock email service to fail
      emailService.sendBookingConfirmation.mockRejectedValueOnce(new Error('Email service unavailable'))
      
      render(<MeetingBookingModal {...defaultProps} />)
      
      // Fill in required fields
      await user.type(screen.getByLabelText(/meeting title/i), 'Test Meeting')
      await user.type(screen.getByLabelText(/attendee name/i), 'John Doe')
      await user.type(screen.getByLabelText(/attendee email/i), 'john.doe@example.com')
      
      const submitButton = screen.getByText('Book Meeting')
      await user.click(submitButton)
      
      // Should still complete booking (email failure shouldn't prevent booking)
      await waitFor(() => {
        expect(defaultProps.onBookingComplete).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    test('should handle calendar service failures gracefully', async () => {
      const user = userEvent.setup()
      const { calendarSyncService } = require('@/lib/notifications/calendar-sync-service')
      
      // Mock calendar service to fail
      calendarSyncService.createCalendarEvent.mockRejectedValueOnce(new Error('Calendar service unavailable'))
      
      render(<MeetingBookingModal {...defaultProps} />)
      
      // Fill in required fields
      await user.type(screen.getByLabelText(/meeting title/i), 'Test Meeting')
      await user.type(screen.getByLabelText(/attendee name/i), 'John Doe')
      await user.type(screen.getByLabelText(/attendee email/i), 'john.doe@example.com')
      
      const submitButton = screen.getByText('Book Meeting')
      await user.click(submitButton)
      
      // Should still complete booking (calendar failure shouldn't prevent booking)
      await waitFor(() => {
        expect(defaultProps.onBookingComplete).toHaveBeenCalled()
      }, { timeout: 3000 })
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<MeetingBookingModal {...defaultProps} />)
      
      expect(screen.getByLabelText(/meeting title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/attendee name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/attendee email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/duration/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/meeting type/i)).toBeInTheDocument()
    })

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<MeetingBookingModal {...defaultProps} />)
      
      const titleInput = screen.getByLabelText(/meeting title/i)
      
      // Should be able to tab to the first input
      await user.tab()
      expect(titleInput).toHaveFocus()
      
      // Should be able to tab through all form elements
      await user.tab() // Description
      await user.tab() // Attendee name
      await user.tab() // Attendee email
      await user.tab() // Duration
      await user.tab() // Meeting type
      await user.tab() // Submit button
      
      expect(screen.getByText('Book Meeting')).toHaveFocus()
    })

    test('should announce form errors to screen readers', async () => {
      const user = userEvent.setup()
      render(<MeetingBookingModal {...defaultProps} />)
      
      const submitButton = screen.getByText('Book Meeting')
      await user.click(submitButton)
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/please fill in all required fields/i)
        expect(errorMessage).toHaveAttribute('role', 'alert')
      })
    })
  })

  describe('Modal Behavior', () => {
    test('should close modal when close button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<MeetingBookingModal {...defaultProps} onClose={onClose} />)
      
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)
      
      expect(onClose).toHaveBeenCalled()
    })

    test('should close modal when escape key is pressed', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<MeetingBookingModal {...defaultProps} onClose={onClose} />)
      
      await user.keyboard('{Escape}')
      
      expect(onClose).toHaveBeenCalled()
    })

    test('should prevent closing modal during booking process', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      
      render(<MeetingBookingModal {...defaultProps} onClose={onClose} />)
      
      // Start booking process
      await user.type(screen.getByLabelText(/meeting title/i), 'Test Meeting')
      await user.type(screen.getByLabelText(/attendee name/i), 'John Doe')
      await user.type(screen.getByLabelText(/attendee email/i), 'john.doe@example.com')
      
      const submitButton = screen.getByText('Book Meeting')
      await user.click(submitButton)
      
      // Try to close during booking
      await user.keyboard('{Escape}')
      
      // Should not close immediately (booking in progress)
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('Form Reset', () => {
    test('should reset form after successful booking', async () => {
      const user = userEvent.setup()
      
      render(<MeetingBookingModal {...defaultProps} />)
      
      // Fill in form
      const titleInput = screen.getByLabelText(/meeting title/i)
      const nameInput = screen.getByLabelText(/attendee name/i)
      const emailInput = screen.getByLabelText(/attendee email/i)
      
      await user.type(titleInput, 'Test Meeting')
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john.doe@example.com')
      
      // Submit form
      const submitButton = screen.getByText('Book Meeting')
      await user.click(submitButton)
      
      // Wait for booking to complete
      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled()
      }, { timeout: 3000 })
      
      // Reopen modal to check if form is reset
      render(<MeetingBookingModal {...defaultProps} />)
      
      expect(screen.getByLabelText(/meeting title/i)).toHaveValue('')
      expect(screen.getByLabelText(/attendee name/i)).toHaveValue('')
      expect(screen.getByLabelText(/attendee email/i)).toHaveValue('')
    })
  })
})
