/**
 * AI-powered Natural Language Rule Parser
 * Converts natural language scheduling constraints into structured rules
 */

export interface ParsedRule {
  id: string
  type: 'weekdays' | 'holidays' | 'timeRange' | 'maxMeetings' | 'duration' | 'buffer' | 'custom'
  enabled: boolean
  description: string
  naturalLanguage: string
  config: Record<string, any>
  confidence: number
}

export interface RuleParsingResult {
  success: boolean
  rule?: ParsedRule
  errors?: string[]
  suggestions?: string[]
}

// Patterns for different rule types
const RULE_PATTERNS = {
  weekdays: [
    /only.*weekdays?/i,
    /monday.*friday/i,
    /work.*days/i,
    /business.*days/i,
    /no.*weekends?/i
  ],
  holidays: [
    /no.*holidays?/i,
    /not.*holidays?/i,
    /exclude.*holidays?/i,
    /skip.*holidays?/i,
    /(swedish|national|public).*holidays?/i
  ],
  timeRange: [
    /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?\s*(?:to|-|until)\s*(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/,
    /between\s*(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?\s*and\s*(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/i,
    /working.*hours/i,
    /office.*hours/i
  ],
  maxMeetings: [
    /max(?:imum)?\s*(\d+)\s*meetings?\s*(?:per\s*)?(day|daily)/i,
    /no\s*more\s*than\s*(\d+)\s*meetings?\s*(?:per\s*)?(day|daily)/i,
    /limit\s*(\d+)\s*meetings?\s*(?:per\s*)?(day|daily)/i
  ],
  duration: [
    /(\d+)\s*min(?:ute)?s?\s*(?:long|duration|meeting)/i,
    /meetings?\s*(?:can\s*be\s*)?(\d+)(?:,\s*(\d+))?(?:,?\s*or\s*(\d+))?\s*min(?:ute)?s?/i,
    /duration(?:s)?\s*(?:of\s*)?(\d+)(?:,\s*(\d+))?(?:,?\s*or\s*(\d+))?\s*min(?:ute)?s?/i
  ],
  buffer: [
    /(\d+)\s*min(?:ute)?s?\s*(?:gap|buffer|break)\s*between/i,
    /at\s*least\s*(\d+)\s*min(?:ute)?s?\s*between/i,
    /minimum\s*(\d+)\s*min(?:ute)?s?\s*(?:gap|buffer)/i
  ]
}

// Time parsing utilities
function parseTime(timeStr: string): { hour: number; minute: number } | null {
  const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/)
  if (!timeMatch) return null

  let hour = parseInt(timeMatch[1])
  const minute = parseInt(timeMatch[2] || '0')
  const period = timeMatch[3]?.toLowerCase()

  if (period === 'pm' && hour < 12) hour += 12
  if (period === 'am' && hour === 12) hour = 0

  return { hour, minute }
}

function formatTime(hour: number, minute: number = 0): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

// Main parsing functions
export async function parseNaturalLanguageRule(input: string): Promise<RuleParsingResult> {
  const normalizedInput = input.trim().toLowerCase()
  
  if (!normalizedInput) {
    return {
      success: false,
      errors: ['Please provide a rule description']
    }
  }

  // Try to match each rule type
  for (const [ruleType, patterns] of Object.entries(RULE_PATTERNS)) {
    for (const pattern of patterns) {
      const match = normalizedInput.match(pattern)
      if (match) {
        const parseResult = await parseSpecificRule(ruleType as any, input, match)
        if (parseResult.success) {
          return parseResult
        }
      }
    }
  }

  // If no specific pattern matches, create a custom rule
  return {
    success: true,
    rule: {
      id: Date.now().toString(),
      type: 'custom',
      enabled: true,
      description: `Custom rule: ${input}`,
      naturalLanguage: input,
      config: { rule: input },
      confidence: 0.5
    }
  }
}

async function parseSpecificRule(
  type: string, 
  originalInput: string, 
  match: RegExpMatchArray
): Promise<RuleParsingResult> {
  const baseRule = {
    id: Date.now().toString(),
    enabled: true,
    naturalLanguage: originalInput,
    confidence: 0.8
  }

  switch (type) {
    case 'weekdays':
      return {
        success: true,
        rule: {
          ...baseRule,
          type: 'weekdays' as const,
          description: 'Only allow meetings on weekdays (Monday-Friday)',
          config: { days: [1, 2, 3, 4, 5] }
        }
      }

    case 'holidays':
      return {
        success: true,
        rule: {
          ...baseRule,
          type: 'holidays' as const,
          description: 'Exclude national holidays',
          config: { 
            country: originalInput.toLowerCase().includes('swedish') ? 'SE' : 'US'
          }
        }
      }

    case 'timeRange': {
      const timeRangeMatch = originalInput.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?\s*(?:to|-|until)\s*(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/i)
      if (timeRangeMatch) {
        const startTime = parseTime(`${timeRangeMatch[1]}:${timeRangeMatch[2] || '00'}${timeRangeMatch[3] || ''}`)
        const endTime = parseTime(`${timeRangeMatch[4]}:${timeRangeMatch[5] || '00'}${timeRangeMatch[6] || ''}`)
        
        if (startTime && endTime) {
          return {
            success: true,
            rule: {
              ...baseRule,
              type: 'timeRange' as const,
              description: `Working hours: ${formatTime(startTime.hour, startTime.minute)} - ${formatTime(endTime.hour, endTime.minute)}`,
              config: {
                startTime: formatTime(startTime.hour, startTime.minute),
                endTime: formatTime(endTime.hour, endTime.minute),
                timezone: 'CET'
              }
            }
          }
        }
      }
      break
    }

    case 'maxMeetings': {
      const maxMatch = match[1]
      if (maxMatch) {
        const maxMeetings = parseInt(maxMatch)
        return {
          success: true,
          rule: {
            ...baseRule,
            type: 'maxMeetings' as const,
            description: `Maximum ${maxMeetings} meetings per day`,
            config: { maxPerDay: maxMeetings }
          }
        }
      }
      break
    }

    case 'duration': {
      const durations: number[] = []
      for (let i = 1; i <= 3; i++) {
        if (match[i]) {
          durations.push(parseInt(match[i]))
        }
      }
      
      if (durations.length > 0) {
        return {
          success: true,
          rule: {
            ...baseRule,
            type: 'duration' as const,
            description: `Meeting durations: ${durations.join(', ')} minutes`,
            config: { allowedDurations: durations }
          }
        }
      }
      break
    }

    case 'buffer': {
      const bufferMatch = match[1]
      if (bufferMatch) {
        const bufferMinutes = parseInt(bufferMatch)
        return {
          success: true,
          rule: {
            ...baseRule,
            type: 'buffer' as const,
            description: `Minimum ${bufferMinutes}-minute gap between meetings`,
            config: { bufferMinutes }
          }
        }
      }
      break
    }
  }

  return {
    success: false,
    errors: [`Could not parse rule of type: ${type}`]
  }
}

// Rule validation and suggestion functions
export function validateRule(rule: ParsedRule): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  switch (rule.type) {
    case 'timeRange':
      if (!rule.config.startTime || !rule.config.endTime) {
        errors.push('Time range must have both start and end times')
      }
      break
    
    case 'maxMeetings':
      if (!rule.config.maxPerDay || rule.config.maxPerDay < 1) {
        errors.push('Maximum meetings per day must be at least 1')
      }
      break
    
    case 'duration':
      if (!rule.config.allowedDurations || rule.config.allowedDurations.length === 0) {
        errors.push('At least one duration must be specified')
      }
      break
    
    case 'buffer':
      if (!rule.config.bufferMinutes || rule.config.bufferMinutes < 0) {
        errors.push('Buffer time must be at least 0 minutes')
      }
      break
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function generateRuleSuggestions(input: string): string[] {
  const suggestions = []
  const lower = input.toLowerCase()

  if (lower.includes('time') || lower.includes('hour')) {
    suggestions.push('Try: "9am to 5pm only" or "Between 10:00 and 16:00"')
  }

  if (lower.includes('day') || lower.includes('week')) {
    suggestions.push('Try: "Only weekdays" or "Maximum 3 meetings per day"')
  }

  if (lower.includes('minute') || lower.includes('duration')) {
    suggestions.push('Try: "Meetings can be 15, 30, or 45 minutes" or "15 minute buffer between meetings"')
  }

  if (lower.includes('holiday')) {
    suggestions.push('Try: "No Swedish national holidays" or "Exclude public holidays"')
  }

  return suggestions
}
