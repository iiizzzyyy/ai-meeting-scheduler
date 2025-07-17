'use client'

import { useState } from 'react'
import CalendarView from '@/components/calendar/calendar-view'
import MeetingBookingModal from '@/components/meetings/meeting-booking-modal'
import SchedulingRules from '@/components/scheduling/scheduling-rules'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Settings, BarChart3, Users } from 'lucide-react'

interface MeetingData {
  title: string
  description: string
  attendeeEmail: string
  attendeeName: string
  date: Date
  time: string
  duration: number
  type: 'video' | 'phone' | 'in-person'
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'analytics' | 'settings'>('calendar')
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{date: Date, time: string} | null>(null)
  const [schedulingRules, setSchedulingRules] = useState<any[]>([]) // Add scheduling rules state
  const [meetings, setMeetings] = useState<MeetingData[]>([])

  const handleNewMeeting = (date?: Date, time?: string) => {
    setSelectedSlot(date && time ? { date, time } : null)
    setShowBookingModal(true)
  }

  const handleBookingComplete = (meetingData: MeetingData) => {
    setMeetings(prev => [...prev, meetingData])
    setShowBookingModal(false)
    setSelectedSlot(null)
    // Here you would typically save to your backend
    console.log('Meeting booked:', meetingData)
  }

  const upcomingMeetings = meetings.filter(meeting => {
    const meetingDateTime = new Date(meeting.date)
    const [hours, minutes] = meeting.time.split(':').map(Number)
    meetingDateTime.setHours(hours, minutes)
    return meetingDateTime > new Date()
  }).slice(0, 3)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                AI Meeting Scheduler
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your meetings with intelligent scheduling
              </p>
            </div>
            <Button onClick={() => handleNewMeeting()}>
              Schedule Meeting
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'calendar', label: 'Calendar', icon: Calendar },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Meetings</p>
                      <p className="text-2xl font-bold text-gray-900">{meetings.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">This Week</p>
                      <p className="text-2xl font-bold text-gray-900">{upcomingMeetings.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                      <p className="text-2xl font-bold text-gray-900">30m</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Settings className="h-8 w-8 text-orange-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Utilization</p>
                      <p className="text-2xl font-bold text-gray-900">85%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calendar Component */}
            <CalendarView onBookMeeting={handleNewMeeting} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <Card>
            <CardHeader>
              <CardTitle>Meeting Analytics</CardTitle>
              <CardDescription>
                Insights into your meeting patterns and productivity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                📊 Analytics dashboard coming soon!
                <br />
                <span className="text-sm">Track meeting frequency, duration trends, and scheduling efficiency.</span>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <SchedulingRules onRulesChange={(rules) => {
            console.log('📋 Scheduling rules updated:', rules)
            setSchedulingRules(rules)
            // TODO: Save rules to backend/state management
          }} />
        )}
      </div>

      {/* Booking Modal */}
      <MeetingBookingModal
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false)
          setSelectedSlot(null)
        }}
        selectedDate={selectedSlot?.date}
        selectedTime={selectedSlot?.time}
        schedulingRules={schedulingRules} // Pass scheduling rules to modal
        existingMeetings={meetings} // Pass existing meetings to modal
        onBookingComplete={handleBookingComplete}
      />
    </div>
  )
}
