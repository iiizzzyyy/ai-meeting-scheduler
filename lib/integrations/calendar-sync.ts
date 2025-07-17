/**
 * Calendar Integration Service
 * Handles calendar sync with external calendar providers (Google Calendar, Outlook, iCal)
 */

// TODO: implement date formatting - import { format, addMinutes } from 'date-fns'

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  attendees?: {
    email: string
    displayName?: string
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  }[]
  location?: string
  conferenceData?: {
    createRequest?: {
      requestId: string
      conferenceSolutionKey: {
        type: 'hangoutsMeet' | 'zoom' | 'teams'
      }
    }
  }
  reminders?: {
    useDefault: boolean
    overrides?: {
      method: 'email' | 'popup'
      minutes: number
    }[]
  }
  visibility?: 'default' | 'public' | 'private'
  status?: 'confirmed' | 'tentative' | 'cancelled'
}

export interface CalendarProvider {
  name: 'google' | 'outlook' | 'apple' | 'ical'
  accessToken?: string
  refreshToken?: string
  calendar_id?: string
}

export interface MeetingData {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  attendeeName: string
  attendeeEmail: string
  hostName: string
  hostEmail: string
  meetingType: 'video' | 'phone' | 'in-person'
  location?: string
  meetingUrl?: string
}

export class CalendarSyncService {
  private providers: Map<string, CalendarProvider> = new Map()
  private timezone: string

  constructor(timezone: string = 'Europe/Stockholm') {
    this.timezone = timezone
  }

  /**
   * Add calendar provider credentials
   */
  addProvider(userId: string, provider: CalendarProvider): void {
    this.providers.set(`${userId}_${provider.name}`, provider)
    console.log(`📅 Added ${provider.name} calendar provider for user ${userId}`)
  }

  /**
   * Create calendar event from meeting data
   */
  async createCalendarEvent(
    meeting: MeetingData, 
    userId: string, 
    providerName: 'google' | 'outlook' | 'apple' = 'google'
  ): Promise<string | null> {
    const provider = this.providers.get(`${userId}_${providerName}`)
    
    if (!provider) {
      console.error(`❌ No ${providerName} provider configured for user ${userId}`)
      return null
    }

    const calendarEvent = this.convertMeetingToCalendarEvent(meeting)
    
    try {
      switch (providerName) {
        case 'google':
          return await this.createGoogleCalendarEvent(calendarEvent, provider)
        case 'outlook':
          return await this.createOutlookCalendarEvent(calendarEvent, provider)
        case 'apple':
          return await this.createAppleCalendarEvent(calendarEvent, provider)
        default:
          throw new Error(`Unsupported provider: ${providerName}`)
      }
    } catch (error) {
      console.error(`❌ Failed to create calendar event:`, error)
      return null
    }
  }

  /**
   * Update existing calendar event
   */
  async updateCalendarEvent(
    eventId: string,
    meeting: MeetingData,
    userId: string,
    providerName: 'google' | 'outlook' | 'apple' = 'google'
  ): Promise<boolean> {
    const provider = this.providers.get(`${userId}_${providerName}`)
    
    if (!provider) {
      console.error(`❌ No ${providerName} provider configured for user ${userId}`)
      return false
    }

    const calendarEvent = this.convertMeetingToCalendarEvent(meeting)
    
    try {
      switch (providerName) {
        case 'google':
          return await this.updateGoogleCalendarEvent(eventId, calendarEvent, provider)
        case 'outlook':
          return await this.updateOutlookCalendarEvent(eventId, calendarEvent, provider)
        case 'apple':
          return await this.updateAppleCalendarEvent(eventId, calendarEvent, provider)
        default:
          throw new Error(`Unsupported provider: ${providerName}`)
      }
    } catch (error) {
      console.error(`❌ Failed to update calendar event:`, error)
      return false
    }
  }

  /**
   * Delete calendar event
   */
  async deleteCalendarEvent(
    eventId: string,
    userId: string,
    providerName: 'google' | 'outlook' | 'apple' = 'google'
  ): Promise<boolean> {
    const provider = this.providers.get(`${userId}_${providerName}`)
    
    if (!provider) {
      console.error(`❌ No ${providerName} provider configured for user ${userId}`)
      return false
    }

    try {
      switch (providerName) {
        case 'google':
          return await this.deleteGoogleCalendarEvent(eventId, provider)
        case 'outlook':
          return await this.deleteOutlookCalendarEvent(eventId, provider)
        case 'apple':
          return await this.deleteAppleCalendarEvent(eventId, provider)
        default:
          throw new Error(`Unsupported provider: ${providerName}`)
      }
    } catch (error) {
      console.error(`❌ Failed to delete calendar event:`, error)
      return false
    }
  }

  /**
   * Generate iCal file for download
   */
  generateICalFile(meeting: MeetingData): string {
    const startDate = this.formatDateForICal(meeting.start)
    const endDate = this.formatDateForICal(meeting.end)
    const now = this.formatDateForICal(new Date())
    const uid = `${meeting.id}@ai-meeting-scheduler.com`

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Meeting Scheduler//Meeting Booking//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
DTSTAMP:${now}
UID:${uid}
CREATED:${now}
LAST-MODIFIED:${now}
SEQUENCE:0
STATUS:CONFIRMED
SUMMARY:${this.escapeICalText(meeting.title)}
DESCRIPTION:${this.escapeICalText(meeting.description || '')}
ORGANIZER;CN=${this.escapeICalText(meeting.hostName)}:mailto:${meeting.hostEmail}
ATTENDEE;CN=${this.escapeICalText(meeting.attendeeName)};RSVP=TRUE:mailto:${meeting.attendeeEmail}
${meeting.location ? `LOCATION:${this.escapeICalText(meeting.location)}` : ''}
${meeting.meetingUrl ? `URL:${meeting.meetingUrl}` : ''}
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Meeting reminder: ${this.escapeICalText(meeting.title)}
END:VALARM
END:VEVENT
END:VCALENDAR`
  }

  /**
   * Convert meeting data to calendar event format
   */
  private convertMeetingToCalendarEvent(meeting: MeetingData): CalendarEvent {
    return {
      id: meeting.id,
      summary: meeting.title,
      description: this.formatMeetingDescription(meeting),
      start: {
        dateTime: meeting.start.toISOString(),
        timeZone: this.timezone
      },
      end: {
        dateTime: meeting.end.toISOString(),
        timeZone: this.timezone
      },
      attendees: [
        {
          email: meeting.hostEmail,
          displayName: meeting.hostName,
          responseStatus: 'accepted'
        },
        {
          email: meeting.attendeeEmail,
          displayName: meeting.attendeeName,
          responseStatus: 'needsAction'
        }
      ],
      location: meeting.location || (meeting.meetingType === 'video' ? 'Video Call' : undefined),
      conferenceData: meeting.meetingType === 'video' && meeting.meetingUrl ? {
        createRequest: {
          requestId: `${meeting.id}_conference`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet' // This would be dynamic based on the meeting URL
          }
        }
      } : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          {
            method: 'email',
            minutes: 15
          },
          {
            method: 'popup',
            minutes: 5
          }
        ]
      },
      visibility: 'default',
      status: 'confirmed'
    }
  }

  /**
   * Format meeting description for calendar
   */
  private formatMeetingDescription(meeting: MeetingData): string {
    let description = meeting.description || ''
    
    description += `\n\n--- Meeting Details ---`
    description += `\nType: ${meeting.meetingType === 'video' ? 'Video Call' : meeting.meetingType === 'phone' ? 'Phone Call' : 'In-Person Meeting'}`
    
    if (meeting.meetingUrl) {
      description += `\nJoin Link: ${meeting.meetingUrl}`
    }
    
    if (meeting.location && meeting.meetingType !== 'video') {
      description += `\nLocation: ${meeting.location}`
    }
    
    description += `\n\nOrganized by: ${meeting.hostName} (${meeting.hostEmail})`
    description += `\nAttendee: ${meeting.attendeeName} (${meeting.attendeeEmail})`
    description += `\n\nGenerated by AI Meeting Scheduler`
    
    return description.trim()
  }

  /**
   * Google Calendar integration
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createGoogleCalendarEvent(_event: CalendarEvent, _provider: CalendarProvider): Promise<string | null> {
    console.log('📅 Creating Google Calendar event...')
    
    // In a real implementation, this would make an API call to Google Calendar
    // const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${provider.accessToken}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(event)
    // })
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const eventId = `google_${_event.id}_${Date.now()}`
    console.log('✅ Google Calendar event created:', eventId)
    
    return eventId
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async updateGoogleCalendarEvent(eventId: string, _event: CalendarEvent, _provider: CalendarProvider): Promise<boolean> {
    console.log('📅 Updating Google Calendar event:', eventId)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    console.log('✅ Google Calendar event updated')
    return true
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async deleteGoogleCalendarEvent(eventId: string, _provider: CalendarProvider): Promise<boolean> {
    console.log('🗑️ Deleting Google Calendar event:', eventId)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300))
    
    console.log('✅ Google Calendar event deleted')
    return true
  }

  /**
   * Outlook Calendar integration
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createOutlookCalendarEvent(_event: CalendarEvent, _provider: CalendarProvider): Promise<string | null> {
    console.log('📅 Creating Outlook Calendar event...')
    
    // In a real implementation, this would make an API call to Microsoft Graph
    // const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${provider.accessToken}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(this.convertToOutlookFormat(event))
    // })
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 600))
    
    const eventId = `outlook_${_event.id}_${Date.now()}`
    console.log('✅ Outlook Calendar event created:', eventId)
    
    return eventId
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async updateOutlookCalendarEvent(eventId: string, _event: CalendarEvent, _provider: CalendarProvider): Promise<boolean> {
    console.log('📅 Updating Outlook Calendar event:', eventId)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    console.log('✅ Outlook Calendar event updated')
    return true
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async deleteOutlookCalendarEvent(eventId: string, _provider: CalendarProvider): Promise<boolean> {
    console.log('🗑️ Deleting Outlook Calendar event:', eventId)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300))
    
    console.log('✅ Outlook Calendar event deleted')
    return true
  }

  /**
   * Apple Calendar integration (via CalDAV)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createAppleCalendarEvent(event: CalendarEvent, _provider: CalendarProvider): Promise<string | null> {
    console.log('📅 Creating Apple Calendar event...')
    
    // In a real implementation, this would use CalDAV protocol
    // This is more complex and would require CalDAV server integration
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 700))
    
    const eventId = `apple_${event.id}_${Date.now()}`
    console.log('✅ Apple Calendar event created:', eventId)
    
    return eventId
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async updateAppleCalendarEvent(eventId: string, _event: CalendarEvent, _provider: CalendarProvider): Promise<boolean> {
    console.log('📅 Updating Apple Calendar event:', eventId)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    console.log('✅ Apple Calendar event updated')
    return true
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async deleteAppleCalendarEvent(eventId: string, _provider: CalendarProvider): Promise<boolean> {
    console.log('🗑️ Deleting Apple Calendar event:', eventId)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300))
    
    console.log('✅ Apple Calendar event deleted')
    return true
  }

  /**
   * Utility functions
   */
  private formatDateForICal(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  private escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
  }

  /**
   * Get calendar sync status for user
   */
  getCalendarSyncStatus(userId: string): {
    google: boolean
    outlook: boolean
    apple: boolean
  } {
    return {
      google: this.providers.has(`${userId}_google`),
      outlook: this.providers.has(`${userId}_outlook`),
      apple: this.providers.has(`${userId}_apple`)
    }
  }

  /**
   * Remove calendar provider
   */
  removeProvider(userId: string, providerName: 'google' | 'outlook' | 'apple'): boolean {
    const key = `${userId}_${providerName}`
    const existed = this.providers.has(key)
    this.providers.delete(key)
    
    if (existed) {
      console.log(`🗑️ Removed ${providerName} calendar provider for user ${userId}`)
    }
    
    return existed
  }
}

// Export singleton instance
export const calendarSyncService = new CalendarSyncService()
