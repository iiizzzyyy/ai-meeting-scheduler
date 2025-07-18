import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { google } from 'googleapis'

// Google Calendar OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/calendar/callback/google`
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth error
    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(new URL('/dashboard/settings?error=google_oauth_failed', request.url))
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing OAuth parameters')
      return NextResponse.redirect(new URL('/dashboard/settings?error=invalid_oauth_response', request.url))
    }

    // Parse state to get user ID
    let userId: string
    try {
      const stateData = JSON.parse(state)
      userId = stateData.userId
    } catch (error) {
      console.error('Invalid state parameter:', error)
      return NextResponse.redirect(new URL('/dashboard/settings?error=invalid_state', request.url))
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    // Set credentials and get user profile
    oauth2Client.setCredentials(tokens)
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const profile = await calendar.calendarList.list()

    // Get primary calendar
    const primaryCalendar = profile.data.items?.find(cal => cal.primary)
    
    if (!primaryCalendar) {
      throw new Error('No primary calendar found')
    }

    // Save connection to database
    const supabase = createClient()
    
    const { error: dbError } = await supabase
      .from('calendar_connections')
      .upsert({
        user_id: userId,
        provider_name: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        calendar_id: primaryCalendar.id,
        calendar_name: primaryCalendar.summary || 'Google Calendar',
        active: true,
        connected_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Failed to save calendar connection')
    }

    // Redirect back to settings with success message
    return NextResponse.redirect(new URL('/dashboard/settings?success=google_connected', request.url))
  } catch (error) {
    console.error('Google Calendar callback error:', error)
    return NextResponse.redirect(new URL('/dashboard/settings?error=google_connection_failed', request.url))
  }
}
