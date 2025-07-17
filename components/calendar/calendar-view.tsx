'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

interface TimeSlot {
  id: string
  time: string
  available: boolean
  booked: boolean
  meetingTitle?: string
}

interface CalendarDay {
  date: Date
  dayNumber: number
  isToday: boolean
  isCurrentMonth: boolean
  timeSlots: TimeSlot[]
}

interface CalendarViewProps {
  onBookMeeting?: (date?: Date, time?: string) => void
}

// Seeded random generator for consistent results
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const generateTimeSlots = (date: Date, isClient: boolean): TimeSlot[] => {
  const slots: TimeSlot[] = []
  const dateSeed = date.getTime() // Use date as seed for consistency
  
  for (let hour = 9; hour < 17; hour++) {
    const hourSeed = dateSeed + hour
    slots.push({
      id: `${date.toISOString().split('T')[0]}-${hour.toString().padStart(2, '0')}:00`,
      time: `${hour.toString().padStart(2, '0')}:00`,
      available: isClient ? seededRandom(hourSeed) > 0.3 : true,
      booked: isClient ? seededRandom(hourSeed + 1000) > 0.7 : false,
      meetingTitle: isClient && seededRandom(hourSeed + 2000) > 0.8 ? 'Client Meeting' : undefined
    })
  }
  return slots
}

export default function CalendarView({ onBookMeeting }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Generate calendar days for the current month
  const generateCalendarDays = (date: Date): CalendarDay[] => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days: CalendarDay[] = []
    const today = new Date()

    for (let i = 0; i < 42; i++) {
      const currentDay = new Date(startDate)
      currentDay.setDate(startDate.getDate() + i)
      
      // Generate basic time slots - only add availability after client renders
      const timeSlots: TimeSlot[] = generateTimeSlots(currentDay, isClient)

      days.push({
        date: currentDay,
        dayNumber: currentDay.getDate(),
        isToday: currentDay.toDateString() === today.toDateString(),
        isCurrentMonth: currentDay.getMonth() === month,
        timeSlots
      })
    }

    return days
  }

  const calendarDays = generateCalendarDays(currentDate)

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev: Date) => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const handleDateClick = (day: CalendarDay) => {
    if (day.isCurrentMonth) {
      setSelectedDate(day.date)
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigateMonth('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const availableSlots = day.timeSlots.filter(slot => slot.available && !slot.booked).length
                  const bookedSlots = day.timeSlots.filter(slot => slot.booked).length
                  
                  return (
                    <div
                      key={index}
                      className={`
                        relative p-2 min-h-[80px] border rounded-lg cursor-pointer transition-colors
                        ${day.isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-400'}
                        ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                        ${selectedDate?.toDateString() === day.date.toDateString() ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}
                      `}
                      onClick={() => handleDateClick(day)}
                    >
                      <div className="font-medium">{day.dayNumber}</div>
                      {day.isCurrentMonth && (
                        <div className="text-xs mt-1 space-y-1">
                          {availableSlots > 0 && (
                            <div className="text-green-600">{availableSlots} available</div>
                          )}
                          {bookedSlots > 0 && (
                            <div className="text-blue-600">{bookedSlots} booked</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day Detail Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {selectedDate ? 
                    selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) 
                    : 'Select a date'
                  }
                </CardTitle>
                {selectedDate && (
                  <Button 
                    size="sm"
                    onClick={() => onBookMeeting?.(selectedDate)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Meeting
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                <div className="space-y-2">
                  {(() => {
                    const selectedDay = calendarDays.find(day => 
                      day.date.toDateString() === selectedDate.toDateString()
                    )
                    return selectedDay?.timeSlots.map(slot => (
                      <div
                        key={slot.id}
                        className={`
                          p-3 rounded-lg border text-sm
                          ${slot.booked ? 'bg-blue-50 border-blue-200' : 
                            slot.available ? 'bg-green-50 border-green-200 cursor-pointer hover:bg-green-100' : 
                            'bg-gray-50 border-gray-200 text-gray-400'}
                        `}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{slot.time}</span>
                          <span className={`
                            text-xs px-2 py-1 rounded-full
                            ${slot.booked ? 'bg-blue-100 text-blue-700' : 
                              slot.available ? 'bg-green-100 text-green-700' : 
                              'bg-gray-100 text-gray-500'}
                          `}>
                            {slot.booked ? 'Booked' : slot.available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                        {slot.meetingTitle && (
                          <div className="text-blue-600 mt-1">{slot.meetingTitle}</div>
                        )}
                      </div>
                    ))
                  })()}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Select a date to view available time slots
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
