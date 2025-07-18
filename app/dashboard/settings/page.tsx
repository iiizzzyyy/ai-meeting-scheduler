'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CalendarDays, Globe, Smartphone, Settings } from 'lucide-react'

interface CalendarProvider {
  name: 'google' | 'outlook' | 'apple'
  displayName: string
  icon: React.ReactNode
  connected: boolean
  description: string
}

export default function SettingsPage() {
  const [calendarProviders, setCalendarProviders] = useState<CalendarProvider[]>([
    {
      name: 'google',
      displayName: 'Google Calendar',
      icon: <Globe className="h-5 w-5" />,
      connected: false,
      description: 'Sync with your Gmail calendar'
    },
    {
      name: 'outlook',
      displayName: 'Outlook Calendar',
      icon: <CalendarDays className="h-5 w-5" />,
      connected: false,
      description: 'Sync with your Outlook/Office 365 calendar'
    },
    {
      name: 'apple',
      displayName: 'Apple Calendar',
      icon: <Smartphone className="h-5 w-5" />,
      connected: false,
      description: 'Sync with your Apple iCloud calendar'
    }
  ])

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Load calendar connection status
    loadCalendarStatus()
  }, [])

  const loadCalendarStatus = async () => {
    try {
      const response = await fetch('/api/calendar/status')
      if (response.ok) {
        const status = await response.json()
        setCalendarProviders(prev => 
          prev.map(provider => ({
            ...provider,
            connected: status[provider.name] || false
          }))
        )
      }
    } catch (error) {
      console.error('Failed to load calendar status:', error)
    }
  }

  const handleConnect = async (providerName: string) => {
    setIsLoading(true)
    try {
      // Redirect to OAuth flow
      const response = await fetch(`/api/calendar/connect/${providerName}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const { authUrl } = await response.json()
        window.location.href = authUrl
      } else {
        throw new Error('Failed to initiate OAuth flow')
      }
    } catch (error) {
      console.error('Failed to connect calendar:', error)
      alert('Failed to connect calendar. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async (providerName: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/calendar/disconnect/${providerName}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        setCalendarProviders(prev => 
          prev.map(provider => 
            provider.name === providerName 
              ? { ...provider, connected: false }
              : provider
          )
        )
      } else {
        throw new Error('Failed to disconnect calendar')
      }
    } catch (error) {
      console.error('Failed to disconnect calendar:', error)
      alert('Failed to disconnect calendar. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your calendar integrations and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Calendar Integration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Calendar Integration
            </CardTitle>
            <CardDescription>
              Connect your external calendars to automatically sync your availability and add meetings to your calendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calendarProviders.map((provider) => (
                <div key={provider.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {provider.icon}
                    <div>
                      <h3 className="font-medium">{provider.displayName}</h3>
                      <p className="text-sm text-muted-foreground">{provider.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {provider.connected ? (
                      <>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Connected
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(provider.name)}
                          disabled={isLoading}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => handleConnect(provider.name)}
                        disabled={isLoading}
                        size="sm"
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Calendar Sync Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Settings</CardTitle>
            <CardDescription>
              Configure how your calendars sync with the meeting scheduler
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Auto-sync availability</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically check your calendar availability when someone books a meeting
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Enable
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Add meetings to calendar</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically add booked meetings to your connected calendars
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Enable
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Meeting reminders</h3>
                  <p className="text-sm text-muted-foreground">
                    Send calendar notifications before meetings
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
