import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { useToast } from '@/hooks/use-toast'
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Calendar,
  Target,
  Coffee,
  Zap,
  TrendingUp,
  Award
} from 'lucide-react'

const SessionTracker = ({ hackathonId, teamId }) => {
  const { user } = useAuth()
  const { connected } = useWebSocket()
  const { toast } = useToast()
  
  const [session, setSession] = useState({
    isActive: false,
    startTime: null,
    endTime: null,
    duration: 0,
    breaks: [],
    currentBreak: null,
    productivity: 0,
    goals: []
  })
  
  const [stats, setStats] = useState({
    totalTime: 0,
    todayTime: 0,
    weekTime: 0,
    averageSession: 0,
    longestSession: 0,
    completedGoals: 0
  })
  
  const [goals, setGoals] = useState([
    { id: 1, title: 'Complete user authentication', completed: false, priority: 'high' },
    { id: 2, title: 'Design landing page mockup', completed: true, priority: 'medium' },
    { id: 3, title: 'Set up database schema', completed: false, priority: 'high' },
    { id: 4, title: 'Write API documentation', completed: false, priority: 'low' }
  ])

  useEffect(() => {
    let interval = null
    
    if (session.isActive && !session.currentBreak) {
      interval = setInterval(() => {
        setSession(prev => ({
          ...prev,
          duration: Date.now() - prev.startTime
        }))
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [session.isActive, session.currentBreak])

  useEffect(() => {
    // Load session data and stats
    loadSessionData()
  }, [])

  const loadSessionData = () => {
    // Mock data - in real app, this would come from API
    setStats({
      totalTime: 25 * 60 * 60 * 1000, // 25 hours
      todayTime: 4 * 60 * 60 * 1000, // 4 hours
      weekTime: 18 * 60 * 60 * 1000, // 18 hours
      averageSession: 2.5 * 60 * 60 * 1000, // 2.5 hours
      longestSession: 6 * 60 * 60 * 1000, // 6 hours
      completedGoals: 12
    })
  }

  const startSession = () => {
    const now = Date.now()
    setSession(prev => ({
      ...prev,
      isActive: true,
      startTime: now,
      endTime: null,
      duration: 0
    }))
    
    toast({
      title: 'Session started',
      description: 'Your work session is now being tracked',
    })
  }

  const pauseSession = () => {
    if (session.currentBreak) {
      // Resume from break
      const breakDuration = Date.now() - session.currentBreak.startTime
      setSession(prev => ({
        ...prev,
        currentBreak: null,
        breaks: [...prev.breaks, {
          startTime: prev.currentBreak.startTime,
          endTime: Date.now(),
          duration: breakDuration
        }]
      }))
      
      toast({
        title: 'Break ended',
        description: 'Welcome back! Session resumed',
      })
    } else {
      // Start break
      setSession(prev => ({
        ...prev,
        currentBreak: {
          startTime: Date.now()
        }
      }))
      
      toast({
        title: 'Break started',
        description: 'Take your time, session is paused',
      })
    }
  }

  const stopSession = () => {
    const now = Date.now()
    const totalDuration = now - session.startTime
    
    setSession(prev => ({
      ...prev,
      isActive: false,
      endTime: now,
      duration: totalDuration,
      currentBreak: null
    }))
    
    // Update stats
    setStats(prev => ({
      ...prev,
      totalTime: prev.totalTime + totalDuration,
      todayTime: prev.todayTime + totalDuration
    }))
    
    toast({
      title: 'Session completed',
      description: `Great work! You worked for ${formatDuration(totalDuration)}`,
    })
  }

  const toggleGoal = (goalId) => {
    setGoals(prev => prev.map(goal => 
      goal.id === goalId 
        ? { ...goal, completed: !goal.completed }
        : goal
    ))
  }

  const formatDuration = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  const getProductivityScore = () => {
    const completedGoals = goals.filter(g => g.completed).length
    const totalGoals = goals.length
    return totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Session Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Current Session</span>
            </div>
            <Badge variant={session.isActive ? 'default' : 'secondary'}>
              {session.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Session Timer */}
          <div className="text-center">
            <div className="text-4xl font-bold text-foreground mb-2">
              {formatDuration(session.duration)}
            </div>
            {session.currentBreak && (
              <Badge variant="outline" className="mb-4">
                <Coffee className="w-3 h-3 mr-1" />
                On Break
              </Badge>
            )}
          </div>

          {/* Session Controls */}
          <div className="flex justify-center space-x-2">
            {!session.isActive ? (
              <Button onClick={startSession} className="flex items-center space-x-2">
                <Play className="w-4 h-4" />
                <span>Start Session</span>
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={pauseSession}
                  className="flex items-center space-x-2"
                >
                  {session.currentBreak ? (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Break</span>
                    </>
                  )}
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={stopSession}
                  className="flex items-center space-x-2"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop</span>
                </Button>
              </>
            )}
          </div>

          {/* Session Info */}
          {session.isActive && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="font-medium">
                  {new Date(session.startTime).toLocaleTimeString()}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Breaks</p>
                <p className="font-medium">{session.breaks.length}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goals Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Session Goals</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {goals.filter(g => g.completed).length}/{goals.length}
              </span>
              <Badge variant="outline">{getProductivityScore()}%</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={getProductivityScore()} className="mb-4" />
          
          {goals.map((goal) => (
            <div 
              key={goal.id} 
              className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                goal.completed ? 'bg-muted/50' : 'hover:bg-muted/30'
              }`}
              onClick={() => toggleGoal(goal.id)}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                goal.completed 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'border-muted-foreground'
              }`}>
                {goal.completed && <span className="text-xs">✓</span>}
              </div>
              <div className="flex-1">
                <p className={`text-sm ${goal.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {goal.title}
                </p>
              </div>
              <Badge variant={getPriorityColor(goal.priority)} className="text-xs">
                {goal.priority}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Statistics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {formatDuration(stats.todayTime)}
              </div>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
            
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {formatDuration(stats.weekTime)}
              </div>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
            
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {formatDuration(stats.averageSession)}
              </div>
              <p className="text-xs text-muted-foreground">Avg Session</p>
            </div>
            
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {stats.completedGoals}
              </div>
              <p className="text-xs text-muted-foreground">Goals Done</p>
            </div>
          </div>

          {/* Achievement */}
          <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Productivity Streak: 5 days
              </span>
            </div>
            <p className="text-xs text-primary/80 mt-1">
              Keep up the great work! You're on fire 🔥
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SessionTracker

