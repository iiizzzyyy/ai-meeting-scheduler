'use client'

import { useState } from 'react'
import { parseNaturalLanguageRule, validateRule } from '@/lib/ai/rule-parser'
// TODO: implement rule suggestions - import { generateRuleSuggestions, type ParsedRule } from '@/lib/ai/rule-parser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Calendar, 
  Clock, 
  Globe, 
  AlertCircle, 
  Plus, 
  X, 
  Settings,
  Sparkles,
  CheckCircle
} from 'lucide-react'

interface SchedulingRule {
  id: string
  type: 'weekdays' | 'holidays' | 'timeRange' | 'maxMeetings' | 'duration' | 'buffer' | 'custom'
  enabled: boolean
  description: string
  naturalLanguage: string
  config: Record<string, any>
}

interface SchedulingRulesProps {
  onRulesChange?: (rules: SchedulingRule[]) => void
}

const DEFAULT_RULES: SchedulingRule[] = [
  {
    id: '1',
    type: 'weekdays',
    enabled: true,
    description: 'Only allow meetings on weekdays (Monday-Friday)',
    naturalLanguage: 'Only book meetings on weekdays',
    config: { days: [1, 2, 3, 4, 5] }
  },
  {
    id: '2',
    type: 'holidays',
    enabled: true,
    description: 'Exclude Swedish national holidays',
    naturalLanguage: 'Not on Swedish national holidays',
    config: { country: 'SE' }
  },
  {
    id: '3',
    type: 'timeRange',
    enabled: true,
    description: 'Working hours: 9:00 AM - 5:00 PM CET',
    naturalLanguage: '9am to 5pm CET only',
    config: { startTime: '09:00', endTime: '17:00', timezone: 'CET' }
  },
  {
    id: '4',
    type: 'maxMeetings',
    enabled: true,
    description: 'Maximum 3 meetings per day',
    naturalLanguage: 'Max 3 meetings per day',
    config: { maxPerDay: 3 }
  },
  {
    id: '5',
    type: 'duration',
    enabled: true,
    description: 'Meeting durations: 15, 30, or 45 minutes',
    naturalLanguage: 'Meetings can be 15, 30, or 45 minutes long',
    config: { allowedDurations: [15, 30, 45] }
  },
  {
    id: '6',
    type: 'buffer',
    enabled: true,
    description: 'Minimum 15-minute gap between meetings',
    naturalLanguage: 'At least 15 minutes between meetings',
    config: { bufferMinutes: 15 }
  }
]

const RULE_ICONS = {
  weekdays: Calendar,
  holidays: Globe,
  timeRange: Clock,
  maxMeetings: AlertCircle,
  duration: Clock,
  buffer: Settings,
  custom: Sparkles
}

export default function SchedulingRules({ onRulesChange }: SchedulingRulesProps) {
  const [rules, setRules] = useState<SchedulingRule[]>(DEFAULT_RULES)
  const [customRule, setCustomRule] = useState('')
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [processingAI, setProcessingAI] = useState(false)

  const handleRuleToggle = (ruleId: string) => {
    const updatedRules = rules.map(rule =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    )
    setRules(updatedRules)
    onRulesChange?.(updatedRules)
  }

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = rules.filter(rule => rule.id !== ruleId)
    setRules(updatedRules)
    onRulesChange?.(updatedRules)
  }

  const handleAddCustomRule = async () => {
    if (!customRule.trim()) return

    setProcessingAI(true)
    
    try {
      // Use AI to parse the natural language rule
      const parseResult = await parseNaturalLanguageRule(customRule)
      
      if (parseResult.success && parseResult.rule) {
        // Validate the parsed rule
        const validation = validateRule(parseResult.rule)
        
        if (validation.valid) {
          const updatedRules = [...rules, parseResult.rule]
          setRules(updatedRules)
          onRulesChange?.(updatedRules)
          
          setCustomRule('')
          setShowAddCustom(false)
          
          // Show success feedback
          console.log('✅ Rule parsed successfully:', parseResult.rule)
        } else {
          console.error('❌ Rule validation failed:', validation.errors)
          alert(`Rule validation failed: ${validation.errors.join(', ')}`)
        }
      } else {
        console.error('❌ Rule parsing failed:', parseResult.errors)
        alert(`Could not parse rule: ${parseResult.errors?.join(', ') || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error processing rule:', error)
      alert('An error occurred while processing your rule. Please try again.')
    } finally {
      setProcessingAI(false)
    }
  }

  const handleConfigUpdate = (ruleId: string, newConfig: Record<string, any>) => {
    const updatedRules = rules.map(rule =>
      rule.id === ruleId ? { ...rule, config: { ...rule.config, ...newConfig } } : rule
    )
    setRules(updatedRules)
    onRulesChange?.(updatedRules)
  }

  const enabledRules = rules.filter(rule => rule.enabled)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Scheduling Rules</h2>
        <p className="text-gray-600">
          Configure intelligent scheduling constraints using natural language rules.
        </p>
      </div>

      {/* AI Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900">
            <Sparkles className="h-5 w-5 mr-2" />
            AI Rule Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-800 text-sm">
            <strong>{enabledRules.length} active rules:</strong>{' '}
            {enabledRules.map(rule => rule.naturalLanguage).join(', ')}.
          </p>
        </CardContent>
      </Card>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map(rule => {
          const Icon = RULE_ICONS[rule.type]
          return (
            <Card key={rule.id} className={rule.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200'}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <Icon className={`h-5 w-5 mt-0.5 ${rule.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900">{rule.description}</h3>
                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                          {rule.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 italic">&ldquo;{rule.naturalLanguage}&rdquo;</p>
                      
                      {/* Rule Configuration */}
                      {rule.enabled && rule.type === 'timeRange' && (
                        <div className="mt-3 grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Start Time</Label>
                            <Input
                              type="time"
                              value={rule.config.startTime}
                              onChange={(e) => handleConfigUpdate(rule.id, { startTime: e.target.value })}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">End Time</Label>
                            <Input
                              type="time"
                              value={rule.config.endTime}
                              onChange={(e) => handleConfigUpdate(rule.id, { endTime: e.target.value })}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Timezone</Label>
                            <Input
                              value={rule.config.timezone}
                              onChange={(e) => handleConfigUpdate(rule.id, { timezone: e.target.value })}
                              className="h-8"
                            />
                          </div>
                        </div>
                      )}

                      {rule.enabled && rule.type === 'maxMeetings' && (
                        <div className="mt-3">
                          <Label className="text-xs">Max Meetings Per Day</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={rule.config.maxPerDay}
                            onChange={(e) => handleConfigUpdate(rule.id, { maxPerDay: parseInt(e.target.value) })}
                            className="h-8 w-20"
                          />
                        </div>
                      )}

                      {rule.enabled && rule.type === 'buffer' && (
                        <div className="mt-3">
                          <Label className="text-xs">Buffer Time (minutes)</Label>
                          <Input
                            type="number"
                            min="5"
                            max="60"
                            step="5"
                            value={rule.config.bufferMinutes}
                            onChange={(e) => handleConfigUpdate(rule.id, { bufferMinutes: parseInt(e.target.value) })}
                            className="h-8 w-20"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => handleRuleToggle(rule.id)}
                    />
                    {rule.type === 'custom' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add Custom Rule */}
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="p-4">
          {!showAddCustom ? (
            <Button
              variant="ghost"
              onClick={() => setShowAddCustom(true)}
              className="w-full h-12 text-gray-500 hover:text-gray-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Rule with AI
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="customRule">Describe your scheduling rule in natural language</Label>
                <Textarea
                  id="customRule"
                  placeholder="e.g., 'No meetings on the first Monday of each month' or 'Only allow 30-minute meetings after 2 PM'"
                  value={customRule}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomRule(e.target.value)}
                  disabled={processingAI}
                  rows={3}
                />
              </div>
              
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  Our AI will parse your rule and automatically configure the scheduling logic.
                </AlertDescription>
              </Alert>

              <div className="flex space-x-2">
                <Button
                  onClick={handleAddCustomRule}
                  disabled={!customRule.trim() || processingAI}
                >
                  {processingAI ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing with AI...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Add Rule
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddCustom(false)
                    setCustomRule('')
                  }}
                  disabled={processingAI}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rule Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Test Your Rules</CardTitle>
          <CardDescription>
            See how your scheduling rules would apply to specific scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            <Settings className="h-8 w-8 mx-auto mb-2" />
            Rule testing interface coming soon!
            <br />
            <span className="text-sm">Test booking scenarios against your configured rules.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
