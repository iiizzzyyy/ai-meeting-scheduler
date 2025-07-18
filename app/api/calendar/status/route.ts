import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get calendar connections from database
    const { data: connections, error } = await supabase
      .from('calendar_connections')
      .select('provider_name, connected_at')
      .eq('user_id', user.id)
      .eq('active', true)

    if (error) {
      console.error('Error fetching calendar connections:', error)
      return NextResponse.json({ error: 'Failed to fetch calendar status' }, { status: 500 })
    }

    // Format response
    const status = {
      google: false,
      outlook: false,
      apple: false
    }

    connections?.forEach(connection => {
      if (connection.provider_name in status) {
        status[connection.provider_name as keyof typeof status] = true
      }
    })

    return NextResponse.json(status)
  } catch (error) {
    console.error('Calendar status API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
