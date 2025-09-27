import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { 
  Bot, 
  Activity, 
  Zap, 
  Brain, 
  Users, 
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Settings,
  RefreshCw,
  Play,
  Pause,
  Square
} from 'lucide-react'

const AgentMonitor = () => {
  const { user, API_BASE_URL, getAuthHeaders } = useAuth()
  const { toast } = useToast()
  
  const [agents, setAgents] = useState([])
  const [systemStats, setSystemStats] = useState({
    totalAgents: 0,
    activeAgents: 0,
    completedTasks: 0,
    averageResponseTime: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState(null)

  useEffect(() => {
    fetchAgentData()
    const interval = setInterval(fetchAgentData, 5000) // Update every 5 seconds
    
    return () => clearInterval(interval)
  }, [])

  const fetchAgentData = async () => {
    try {
      // Mock data - in real app, this would come from API
      const mockAgents = [
        {
          id: 'profile-parser-1',
          name: 'Profile Parsing Agent',
          type: 'ProfileParsingAgent',
          status: 'active',
          health: 95,
          uptime: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
          tasksCompleted: 147,
          tasksInProgress: 3,
          averageProcessingTime: 2.3, // seconds
          lastActivity: Date.now() - (30 * 1000), // 30 seconds ago
          metrics: {
            resumesParsed: 147,
            skillsExtracted: 1205,
            successRate: 98.6,
            averageAccuracy: 94.2
          },
          recentTasks: [
            {
              id: 'task-1',
              type: 'resume_parse',
              status: 'completed',
              startTime: Date.now() - (5 * 60 * 1000),
              endTime: Date.now() - (4 * 60 * 1000),
              result: 'Successfully extracted 12 skills from resume'
            },
            {
              id: 'task-2',
              type: 'skill_analysis',
              status: 'in_progress',
              startTime: Date.now() - (2 * 60 * 1000),
              progress: 65
            }
          ]
        },
        {
          id: 'skill-matcher-1',
          name: 'Skill Matching Agent',
          type: 'SkillMatchingAgent',
          status: 'active',
          health: 88,
          uptime: Date.now() - (4 * 60 * 60 * 1000),
          tasksCompleted: 89,
          tasksInProgress: 2,
          averageProcessingTime: 1.8,
          lastActivity: Date.now() - (45 * 1000),
          metrics: {
            matchesGenerated: 89,
            averageCompatibility: 87.3,
            successfulMatches: 76,
            matchAccuracy: 92.1
          },
          recentTasks: [
            {
              id: 'task-3',
              type: 'compatibility_analysis',
              status: 'completed',
              startTime: Date.now() - (3 * 60 * 1000),
              endTime: Date.now() - (2 * 60 * 1000),
              result: 'Generated 5 high-compatibility matches (avg: 91.2%)'
            }
          ]
        },
        {
          id: 'team-former-1',
          name: 'Team Formation Agent',
          type: 'TeamFormingAgent',
          status: 'idle',
          health: 100,
          uptime: Date.now() - (6 * 60 * 60 * 1000),
          tasksCompleted: 23,
          tasksInProgress: 0,
          averageProcessingTime: 5.7,
          lastActivity: Date.now() - (10 * 60 * 1000),
          metrics: {
            teamsFormed: 23,
            averageTeamSize: 4.2,
            formationSuccessRate: 95.7,
            diversityScore: 88.9
          },
          recentTasks: [
            {
              id: 'task-4',
              type: 'team_optimization',
              status: 'completed',
              startTime: Date.now() - (15 * 60 * 1000),
              endTime: Date.now() - (10 * 60 * 1000),
              result: 'Formed optimal team of 5 members with 94% skill coverage'
            }
          ]
        }
      ]

      setAgents(mockAgents)
      
      // Calculate system stats
      const totalAgents = mockAgents.length
      const activeAgents = mockAgents.filter(a => a.status === 'active').length
      const completedTasks = mockAgents.reduce((sum, a) => sum + a.tasksCompleted, 0)
      const averageResponseTime = mockAgents.reduce((sum, a) => sum + a.averageProcessingTime, 0) / totalAgents

      setSystemStats({
        totalAgents,
        activeAgents,
        completedTasks,
        averageResponseTime: averageResponseTime.toFixed(1)
      })

      if (!selectedAgent && mockAgents.length > 0) {
        setSelectedAgent(mockAgents[0])
      }
    } catch (error) {
      console.error('Failed to fetch agent data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load agent data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'default'
      case 'idle': return 'secondary'
      case 'error': return 'destructive'
      case 'maintenance': return 'outline'
      default: return 'secondary'
    }
  }

  const getHealthColor = (health) => {
    if (health >= 90) return 'text-green-600'
    if (health >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatUptime = (timestamp) => {
    const uptime = Date.now() - timestamp
    const hours = Math.floor(uptime / (1000 * 60 * 60))
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const formatLastActivity = (timestamp) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const seconds = Math.floor(diff / 1000)
    
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  const controlAgent = async (agentId, action) => {
    try {
      // Mock API call
      toast({
        title: `Agent ${action}`,
        description: `Successfully ${action}ed agent ${agentId}`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${action} agent`,
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Agents</p>
                <p className="text-2xl font-bold">{systemStats.totalAgents}</p>
              </div>
              <Bot className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Agents</p>
                <p className="text-2xl font-bold text-green-600">{systemStats.activeAgents}</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasks Completed</p>
                <p className="text-2xl font-bold">{systemStats.completedTasks}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{systemStats.averageResponseTime}s</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Details */}
      <Tabs value={selectedAgent?.id} onValueChange={(value) => setSelectedAgent(agents.find(a => a.id === value))}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            {agents.map((agent) => (
              <TabsTrigger key={agent.id} value={agent.id} className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  agent.status === 'active' ? 'bg-green-500' : 
                  agent.status === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span>{agent.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          <Button variant="outline" size="sm" onClick={fetchAgentData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {agents.map((agent) => (
          <TabsContent key={agent.id} value={agent.id} className="space-y-6">
            {/* Agent Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-5 h-5" />
                    <span>{agent.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(agent.status)}>
                      {agent.status}
                    </Badge>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => controlAgent(agent.id, 'restart')}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => controlAgent(agent.id, agent.status === 'active' ? 'pause' : 'start')}
                      >
                        {agent.status === 'active' ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Health</p>
                    <div className="flex items-center space-x-2">
                      <Progress value={agent.health} className="flex-1" />
                      <span className={`text-sm font-medium ${getHealthColor(agent.health)}`}>
                        {agent.health}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Uptime</p>
                    <p className="font-medium">{formatUptime(agent.uptime)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tasks in Progress</p>
                    <p className="font-medium">{agent.tasksInProgress}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Activity</p>
                    <p className="font-medium">{formatLastActivity(agent.lastActivity)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agent Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Performance Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(agent.metrics).map(([key, value]) => (
                    <div key={key} className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-lg font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Recent Tasks</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agent.recentTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'in_progress' ? 'bg-blue-500' :
                          task.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">{task.type.replace(/_/g, ' ')}</p>
                          {task.result && (
                            <p className="text-xs text-muted-foreground">{task.result}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {task.status}
                        </Badge>
                        {task.progress && (
                          <div className="flex items-center space-x-2 mt-1">
                            <Progress value={task.progress} className="w-16 h-1" />
                            <span className="text-xs text-muted-foreground">{task.progress}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default AgentMonitor

