import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// Microsoft Graph OAuth configuration
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/calendar/callback/outlook`

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth error
    if (error) {
      console.error('Outlook OAuth error:', error)
      return NextResponse.redirect(new URL('/dashboard/settings?error=outlook_oauth_failed', request.url))
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
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID || '',
        client_secret: MICROSOFT_CLIENT_SECRET || '',
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: MICROSOFT_REDIRECT_URI,
        scope: 'https://graph.microsoft.com/calendars.read https://graph.microsoft.com/calendars.readwrite offline_access'
      })
    })

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    // Get user profile and calendar information
    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    })

    const profile = await profileResponse.json()

    // Get primary calendar
    const calendarResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendar', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    })

    const calendar = await calendarResponse.json()

    // Save connection to database
    const supabase = createClient()
    
    const accessToken = tokens.access_token || ''
    const refreshToken = tokens.refresh_token || ''

    const { error: dbError } = await supabase
      .from('calendar_connections')
      .upsert({
        user_id: userId,
        provider_name: 'outlook',
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        calendar_id: calendar.id,
        calendar_name: calendar.name || 'Outlook Calendar',
        provider_user_id: profile.id,
        provider_user_email: profile.mail || profile.userPrincipalName,
        active: true,
        connected_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Failed to save calendar connection')
    }

    // Redirect back to settings with success message
    return NextResponse.redirect(new URL('/dashboard/settings?success=outlook_connected', request.url))
  } catch (error) {
    console.error('Outlook Calendar callback error:', error)
    return NextResponse.redirect(new URL('/dashboard/settings?error=outlook_connection_failed', request.url))
  }
}
