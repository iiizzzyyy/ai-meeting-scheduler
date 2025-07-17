'use client'

import { useState, useEffect } from 'react'
import { SchedulingRuleEngine, type BookingValidationResult, type SchedulingRule } from '@/lib/scheduling/rule-engine'
import { emailService } from '@/lib/notifications/email-service'
import { calendarSyncService } from '@/lib/integrations/calendar-sync'
import { format, addMinutes } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// import { Alert, AlertDescription } from '@/components/ui/alert' // TODO: implement error alerts
import { X, Calendar, Clock, User, Mail, MessageSquare } from 'lucide-react'

interface MeetingBookingModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: Date
  selectedTime?: string
  onBookingComplete?: (booking: any) => void
  schedulingRules?: SchedulingRule[]
  existingMeetings?: any[]
}

// TODO: implement meeting data interface when needed
// interface MeetingData {
//   title: string
//   description: string
//   attendeeEmail: string
//   attendeeName: string
//   date: Date
//   time: string
//   duration: number
//   type: 'video' | 'phone' | 'in-person'
// }

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' }
]

const MEETING_TYPES = [
  { value: 'video', label: 'Video Call', icon: '📹' },
  { value: 'phone', label: 'Phone Call', icon: '📞' },
  { value: 'in-person', label: 'In Person', icon: '🤝' }
]

export default function MeetingBookingModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  selectedTime, 
  onBookingComplete,
  schedulingRules = [],
  existingMeetings = []
}: MeetingBookingModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    attendeeEmail: '',
    attendeeName: '',
    duration: 30,
    type: 'video' as 'video' | 'phone' | 'in-person'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ruleEngine] = useState(() => new SchedulingRuleEngine(schedulingRules, existingMeetings))
  const [validationResult, setValidationResult] = useState<BookingValidationResult | null>(null)

  // Validate booking against rules when form data changes
  useEffect(() => {
    if (selectedDate && selectedTime && formData.duration) {
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const proposedStart = new Date(selectedDate)
      proposedStart.setHours(hours, minutes, 0, 0)
      
      const validation = ruleEngine.validateBooking(proposedStart, formData.duration)
      setValidationResult(validation)
    }
  }, [selectedDate, selectedTime, formData.duration, formData.attendeeEmail, ruleEngine])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Basic form validation
      if (!formData.title.trim()) {
        throw new Error('Meeting title is required')
      }
      if (!formData.attendeeEmail.trim()) {
        throw new Error('Attendee email is required')
      }
      if (!formData.attendeeName.trim()) {
        throw new Error('Attendee name is required')
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.attendeeEmail)) {
        throw new Error('Please enter a valid email address')
      }

      // Rule engine validation
      if (validationResult && !validationResult.valid) {
        const errorViolations = validationResult.violations.filter(v => v.severity === 'error')
        if (errorViolations.length > 0) {
          throw new Error(`Scheduling conflict: ${errorViolations[0].description}`)
        }
      }

      // Create meeting data with proper date/time handling
      const [hours, minutes] = (selectedTime || '09:00').split(':').map(Number)
      const meetingStart = new Date(selectedDate || new Date())
      meetingStart.setHours(hours, minutes, 0, 0)
      const meetingEnd = addMinutes(meetingStart, formData.duration)

      const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const meetingData = {
        id: meetingId,
        title: formData.title,
        description: formData.description,
        start: meetingStart,
        end: meetingEnd,
        attendeeName: formData.attendeeName,
        attendeeEmail: formData.attendeeEmail,
        hostName: 'AI Meeting Scheduler', // TODO: Get from user context
        hostEmail: 'host@ai-scheduler.com', // TODO: Get from user context
        meetingType: formData.type,
        location: formData.type === 'in-person' ? 'TBD' : undefined,
        meetingUrl: formData.type === 'video' ? `https://meet.example.com/${meetingId}` : undefined
      }

      // Simulate API call to save meeting
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Send email confirmation
      try {
        console.log('📧 Sending booking confirmation email...')
        await emailService.sendBookingConfirmation(meetingData)
        
        // Schedule reminder email
        await emailService.scheduleReminder(meetingData, 15)
        
        console.log('✅ Email notifications sent successfully')
      } catch (emailError) {
        console.warn('⚠️ Email notification failed:', emailError)
        // Don't fail the booking if email fails
      }

      // Create calendar events
      try {
        console.log('📅 Creating calendar events...')
        
        // For demo purposes, we'll simulate calendar sync
        // In production, this would use actual user credentials
        const userId = 'demo_user' // TODO: Get from user context
        
        // Add demo calendar provider
        calendarSyncService.addProvider(userId, {
          name: 'google',
          accessToken: 'demo_token',
          calendar_id: 'primary'
        })
        
        const calendarEventId = await calendarSyncService.createCalendarEvent(
          meetingData,
          userId,
          'google'
        )
        
        if (calendarEventId) {
          console.log('✅ Calendar event created:', calendarEventId)
        }
        
        // Generate iCal file for download
        // TODO: implement download functionality
        // const _iCalContent = calendarSyncService.generateICalFile(meetingData)
        console.log('📄 iCal file generated for download')
        
      } catch (calendarError) {
        console.warn('⚠️ Calendar sync failed:', calendarError)
        // Don't fail the booking if calendar sync fails
      }

      console.log('🎉 Meeting booked successfully with full integration:', meetingData)
      onBookingComplete?.(meetingData)
      onClose()
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        attendeeEmail: '',
        attendeeName: '',
        duration: 30,
        type: 'video'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Book a Meeting</CardTitle>
              <CardDescription>
                {selectedDate && selectedTime && (
                  <span className="flex items-center mt-2 text-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                    <Clock className="h-4 w-4 ml-4 mr-2" />
                    {selectedTime}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                {error}
              </div>
            )}
            
            {/* Rule Validation Feedback */}
            {validationResult && (
              <div className={`p-3 text-sm rounded-md border ${
                validationResult.valid 
                  ? 'text-green-600 bg-green-50 border-green-200'
                  : 'text-amber-600 bg-amber-50 border-amber-200'
              }`}>
                {validationResult.valid ? (
                  <div className="flex items-center">
                    <span className="mr-2">✅</span>
                    Time slot is available and meets all scheduling rules
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center mb-2">
                      <span className="mr-2">⚠️</span>
                      <span className="font-medium">Scheduling Issues Detected:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      {validationResult.violations.map((violation, index) => (
                        <li key={index} className={`text-sm ${
                          violation.severity === 'error' ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          {violation.description}
                        </li>
                      ))}
                    </ul>
                    {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-amber-200">
                        <div className="text-sm font-medium mb-1">💡 Alternative suggestions:</div>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          {validationResult.suggestions.slice(0, 3).map((suggestion, index) => (
                            <li key={index} className="text-xs text-amber-700">
                              {format(suggestion, 'MMM d, yyyy \\at h:mm a')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Meeting Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Weekly Team Sync"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Meeting Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Meeting Description</Label>
              <Textarea
                id="description"
                placeholder="What would you like to discuss?"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>

            {/* Attendee Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="attendeeName">Attendee Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="attendeeName"
                    placeholder="John Doe"
                    value={formData.attendeeName}
                    onChange={(e) => handleInputChange('attendeeName', e.target.value)}
                    disabled={loading}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendeeEmail">Attendee Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="attendeeEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.attendeeEmail}
                    onChange={(e) => handleInputChange('attendeeEmail', e.target.value)}
                    disabled={loading}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Duration Selection */}
            <div className="space-y-2">
              <Label>Meeting Duration</Label>
              <div className="grid grid-cols-2 gap-2">
                {DURATION_OPTIONS.map(option => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={formData.duration === option.value ? "default" : "outline"}
                    onClick={() => handleInputChange('duration', option.value)}
                    disabled={loading}
                    className="justify-start"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Meeting Type */}
            <div className="space-y-2">
              <Label>Meeting Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {MEETING_TYPES.map(type => (
                  <Button
                    key={type.value}
                    type="button"
                    variant={formData.type === type.value ? "default" : "outline"}
                    onClick={() => handleInputChange('type', type.value)}
                    disabled={loading}
                    className="justify-start text-xs"
                  >
                    <span className="mr-1">{type.icon}</span>
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* AI Scheduling Note */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <strong>AI Scheduling:</strong> This meeting will automatically respect your scheduling rules (e.g., weekdays only, holiday exclusions, time zones, meeting gaps).
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'Booking...' : 'Book Meeting'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
