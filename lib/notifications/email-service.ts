/**
 * Email Notification Service
 * Handles email notifications for meeting bookings, confirmations, and reminders
 */

import { format, subMinutes } from 'date-fns'
// import { addMinutes } from 'date-fns'

export interface EmailTemplate {
  subject: string
  htmlBody: string
  textBody: string
}

export interface MeetingDetails {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  attendeeName: string
  attendeeEmail: string
  hostName: string
  hostEmail: string
  meetingUrl?: string
  meetingType: 'video' | 'phone' | 'in-person'
  location?: string
}

export interface EmailNotificationOptions {
  type: 'booking_confirmation' | 'booking_reminder' | 'booking_cancellation' | 'booking_rescheduled'
  meeting: MeetingDetails
  customMessage?: string
  reminderMinutes?: number
}

export class EmailService {
  private apiKey: string
  private senderEmail: string
  private senderName: string

  constructor(
    apiKey: string = process.env.EMAIL_API_KEY || '',
    senderEmail: string = process.env.SENDER_EMAIL || 'noreply@your-domain.com',
    senderName: string = process.env.SENDER_NAME || 'AI Meeting Scheduler'
  ) {
    this.apiKey = apiKey
    this.senderEmail = senderEmail
    this.senderName = senderName
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(meeting: MeetingDetails): Promise<boolean> {
    const template = this.generateBookingConfirmationTemplate(meeting)
    
    return await this.sendEmail({
      to: meeting.attendeeEmail,
      toName: meeting.attendeeName,
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody,
      cc: meeting.hostEmail !== meeting.attendeeEmail ? meeting.hostEmail : undefined
    })
  }

  /**
   * Send booking reminder email
   */
  async sendBookingReminder(meeting: MeetingDetails, reminderMinutes: number = 15): Promise<boolean> {
    const template = this.generateBookingReminderTemplate(meeting, reminderMinutes)
    
    return await this.sendEmail({
      to: meeting.attendeeEmail,
      toName: meeting.attendeeName,
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody
    })
  }

  /**
   * Send cancellation email
   */
  async sendBookingCancellation(meeting: MeetingDetails, reason?: string): Promise<boolean> {
    const template = this.generateCancellationTemplate(meeting, reason)
    
    return await this.sendEmail({
      to: meeting.attendeeEmail,
      toName: meeting.attendeeName,
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody
    })
  }

  /**
   * Send rescheduling email
   */
  async sendBookingRescheduled(
    oldMeeting: MeetingDetails, 
    newMeeting: MeetingDetails
  ): Promise<boolean> {
    const template = this.generateReschedulingTemplate(oldMeeting, newMeeting)
    
    return await this.sendEmail({
      to: newMeeting.attendeeEmail,
      toName: newMeeting.attendeeName,
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody
    })
  }

  /**
   * Generic email sending method
   */
  private async sendEmail(emailData: {
    to: string
    toName: string
    subject: string
    htmlBody: string
    textBody: string
    cc?: string
  }): Promise<boolean> {
    try {
      // In a real implementation, this would integrate with an email service like:
      // - SendGrid
      // - Mailgun
      // - AWS SES
      // - Resend
      // - Postmark
      
      console.log('📧 Sending email...')
      console.log('To:', emailData.to, `(${emailData.toName})`)
      console.log('Subject:', emailData.subject)
      console.log('CC:', emailData.cc || 'None')
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // For demo purposes, we'll log the email content
      if (process.env.NODE_ENV === 'development') {
        console.log('--- EMAIL CONTENT ---')
        console.log('HTML Body:')
        console.log(emailData.htmlBody)
        console.log('--- END EMAIL ---')
      }
      
      console.log('✅ Email sent successfully!')
      return true
    } catch (error) {
      console.error('❌ Failed to send email:', error)
      return false
    }
  }

  /**
   * Generate booking confirmation email template
   */
  private generateBookingConfirmationTemplate(meeting: MeetingDetails): EmailTemplate {
    const meetingDate = format(meeting.start, 'EEEE, MMMM d, yyyy')
    const meetingTime = format(meeting.start, 'h:mm a')
    const duration = Math.round((meeting.end.getTime() - meeting.start.getTime()) / (1000 * 60))
    
    const subject = `✅ Meeting Confirmed: ${meeting.title} - ${meetingDate} at ${meetingTime}`
    
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
        .content { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .meeting-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Meeting Confirmed!</h1>
        <p>Your appointment has been successfully scheduled</p>
    </div>
    
    <div class="content">
        <h2>Hello ${meeting.attendeeName}!</h2>
        <p>Great news! Your meeting has been confirmed. Here are the details:</p>
        
        <div class="meeting-details">
            <h3>📅 ${meeting.title}</h3>
            <p><strong>Date:</strong> ${meetingDate}</p>
            <p><strong>Time:</strong> ${meetingTime} (${duration} minutes)</p>
            <p><strong>Type:</strong> ${meeting.meetingType === 'video' ? '💻 Video Call' : meeting.meetingType === 'phone' ? '📞 Phone Call' : '🏢 In-Person'}</p>
            ${meeting.description ? `<p><strong>Description:</strong> ${meeting.description}</p>` : ''}
            ${meeting.location ? `<p><strong>Location:</strong> ${meeting.location}</p>` : ''}
            ${meeting.meetingUrl ? `<p><strong>Meeting Link:</strong> <a href="${meeting.meetingUrl}" style="color: #667eea;">${meeting.meetingUrl}</a></p>` : ''}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            ${meeting.meetingUrl ? `<a href="${meeting.meetingUrl}" class="button">Join Meeting</a>` : ''}
            <a href="mailto:${meeting.hostEmail}" class="button" style="background: #28a745;">Contact Host</a>
        </div>
        
        <p><strong>What's next?</strong></p>
        <ul>
            <li>Add this meeting to your calendar</li>
            <li>You'll receive a reminder 15 minutes before the meeting</li>
            <li>If you need to reschedule or cancel, please contact us as soon as possible</li>
        </ul>
        
        <p>We look forward to meeting with you!</p>
    </div>
    
    <div class="footer">
        <p>This email was sent by ${this.senderName}</p>
        <p>If you have any questions, please reply to this email or contact ${meeting.hostEmail}</p>
    </div>
</body>
</html>`

    const textBody = `
Meeting Confirmed: ${meeting.title}

Hello ${meeting.attendeeName}!

Your meeting has been confirmed with the following details:

Date: ${meetingDate}
Time: ${meetingTime} (${duration} minutes)
Type: ${meeting.meetingType}
${meeting.description ? `Description: ${meeting.description}` : ''}
${meeting.location ? `Location: ${meeting.location}` : ''}
${meeting.meetingUrl ? `Meeting Link: ${meeting.meetingUrl}` : ''}

You'll receive a reminder 15 minutes before the meeting.

If you need to reschedule or cancel, please contact ${meeting.hostEmail}.

Thank you!
${this.senderName}
`

    return { subject, htmlBody, textBody }
  }

  /**
   * Generate booking reminder email template
   */
  private generateBookingReminderTemplate(meeting: MeetingDetails, reminderMinutes: number): EmailTemplate {
    const meetingDate = format(meeting.start, 'EEEE, MMMM d, yyyy')
    const meetingTime = format(meeting.start, 'h:mm a')
    
    const subject = `🔔 Reminder: ${meeting.title} in ${reminderMinutes} minutes`
    
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ffd89b 0%, #19547b 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
        .content { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .reminder-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .button { display: inline-block; background: #19547b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔔 Meeting Reminder</h1>
        <p>Your meeting starts in ${reminderMinutes} minutes</p>
    </div>
    
    <div class="content">
        <h2>Hello ${meeting.attendeeName}!</h2>
        
        <div class="reminder-box">
            <h3>📅 ${meeting.title}</h3>
            <p><strong>Starting at ${meetingTime} on ${meetingDate}</strong></p>
            <p>Don't forget about your upcoming meeting!</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            ${meeting.meetingUrl ? `<a href="${meeting.meetingUrl}" class="button">Join Meeting Now</a>` : ''}
        </div>
        
        <p><strong>Quick checklist:</strong></p>
        <ul>
            <li>✅ Test your audio and video (if applicable)</li>
            <li>✅ Have your materials ready</li>
            <li>✅ Find a quiet space</li>
            <li>✅ Join a few minutes early</li>
        </ul>
    </div>
</body>
</html>`

    const textBody = `
Meeting Reminder: ${meeting.title}

Hello ${meeting.attendeeName}!

This is a reminder that your meeting starts in ${reminderMinutes} minutes.

Meeting: ${meeting.title}
Time: ${meetingTime} on ${meetingDate}
${meeting.meetingUrl ? `Link: ${meeting.meetingUrl}` : ''}

See you soon!
`

    return { subject, htmlBody, textBody }
  }

  /**
   * Generate cancellation email template
   */
  private generateCancellationTemplate(meeting: MeetingDetails, reason?: string): EmailTemplate {
    const meetingDate = format(meeting.start, 'EEEE, MMMM d, yyyy')
    const meetingTime = format(meeting.start, 'h:mm a')
    
    const subject = `❌ Meeting Cancelled: ${meeting.title} - ${meetingDate}`
    
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
        .content { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class="header">
        <h1>❌ Meeting Cancelled</h1>
    </div>
    
    <div class="content">
        <h2>Hello ${meeting.attendeeName},</h2>
        <p>We regret to inform you that the following meeting has been cancelled:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>${meeting.title}</h3>
            <p><strong>Was scheduled for:</strong> ${meetingDate} at ${meetingTime}</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        
        <p>We apologize for any inconvenience this may cause. If you'd like to reschedule, please feel free to book a new time slot.</p>
        
        <p>Thank you for your understanding.</p>
    </div>
</body>
</html>`

    const textBody = `
Meeting Cancelled: ${meeting.title}

Hello ${meeting.attendeeName},

We regret to inform you that your meeting scheduled for ${meetingDate} at ${meetingTime} has been cancelled.

${reason ? `Reason: ${reason}` : ''}

We apologize for any inconvenience. Please feel free to reschedule if needed.

Thank you for your understanding.
`

    return { subject, htmlBody, textBody }
  }

  /**
   * Generate rescheduling email template
   */
  private generateReschedulingTemplate(oldMeeting: MeetingDetails, newMeeting: MeetingDetails): EmailTemplate {
    const oldDate = format(oldMeeting.start, 'EEEE, MMMM d, yyyy \'at\' h:mm a')
    const newDate = format(newMeeting.start, 'EEEE, MMMM d, yyyy')
    const newTime = format(newMeeting.start, 'h:mm a')
    
    const subject = `📅 Meeting Rescheduled: ${newMeeting.title} - ${newDate}`
    
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
        .content { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .old-time { background: #ffe0e0; padding: 15px; border-radius: 6px; text-decoration: line-through; margin: 10px 0; }
        .new-time { background: #e0ffe0; padding: 15px; border-radius: 6px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📅 Meeting Rescheduled</h1>
    </div>
    
    <div class="content">
        <h2>Hello ${newMeeting.attendeeName}!</h2>
        <p>Your meeting has been rescheduled. Here are the updated details:</p>
        
        <h3>${newMeeting.title}</h3>
        
        <div class="old-time">
            <strong>Previous time:</strong> ${oldDate}
        </div>
        
        <div class="new-time">
            <strong>New time:</strong> ${newDate} at ${newTime}
        </div>
        
        ${newMeeting.meetingUrl ? `<p><strong>Meeting Link:</strong> <a href="${newMeeting.meetingUrl}">${newMeeting.meetingUrl}</a></p>` : ''}
        
        <p>Please update your calendar accordingly. You'll receive a reminder before the new meeting time.</p>
        
        <p>Thank you for your flexibility!</p>
    </div>
</body>
</html>`

    const textBody = `
Meeting Rescheduled: ${newMeeting.title}

Hello ${newMeeting.attendeeName}!

Your meeting has been rescheduled:

Previous time: ${oldDate}
New time: ${newDate} at ${newTime}

${newMeeting.meetingUrl ? `Meeting Link: ${newMeeting.meetingUrl}` : ''}

Please update your calendar accordingly.

Thank you!
`

    return { subject, htmlBody, textBody }
  }

  /**
   * Schedule email reminder
   */
  async scheduleReminder(meeting: MeetingDetails, reminderMinutes: number = 15): Promise<boolean> {
    const reminderTime = subMinutes(meeting.start, reminderMinutes)
    const now = new Date()
    
    if (reminderTime <= now) {
      console.log('⚠️ Reminder time has already passed, sending immediately')
      return await this.sendBookingReminder(meeting, reminderMinutes)
    }
    
    const delay = reminderTime.getTime() - now.getTime()
    
    setTimeout(async () => {
      await this.sendBookingReminder(meeting, reminderMinutes)
    }, delay)
    
    console.log(`⏰ Reminder scheduled for ${format(reminderTime, 'yyyy-MM-dd HH:mm:ss')}`)
    return true
  }
}

// Export singleton instance
export const emailService = new EmailService()
