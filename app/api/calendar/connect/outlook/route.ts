import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// Microsoft Graph OAuth configuration
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/calendar/callback/outlook`

export async function POST(_request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Microsoft OAuth credentials are configured
    if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
      return NextResponse.json({ 
        error: 'Outlook Calendar integration not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET environment variables.' 
      }, { status: 500 })
    }

    // Generate the URL for Microsoft OAuth consent screen
    const scopes = [
      'https://graph.microsoft.com/calendars.read',
      'https://graph.microsoft.com/calendars.readwrite',
      'offline_access'
    ]

    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
    authUrl.searchParams.append('client_id', MICROSOFT_CLIENT_ID)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('redirect_uri', MICROSOFT_REDIRECT_URI)
    authUrl.searchParams.append('scope', scopes.join(' '))
    authUrl.searchParams.append('state', JSON.stringify({ userId: user.id, provider: 'outlook' }))
    authUrl.searchParams.append('prompt', 'consent')

    return NextResponse.json({ authUrl: authUrl.toString() })
  } catch (error) {
    console.error('Outlook Calendar OAuth error:', error)
    return NextResponse.json({ error: 'Failed to initiate Outlook Calendar connection' }, { status: 500 })
  }
}
