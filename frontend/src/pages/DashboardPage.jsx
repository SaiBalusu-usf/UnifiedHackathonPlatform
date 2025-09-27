import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { 
  Users, 
  Calendar, 
  Trophy, 
  Clock, 
  MapPin, 
  Zap,
  TrendingUp,
  Bell,
  Activity,
  Target,
  Star,
  ArrowRight
} from 'lucide-react'
import { Link } from 'react-router-dom'

const DashboardPage = () => {
  const { user, API_BASE_URL, getAuthHeaders } = useAuth()
  const { connected } = useWebSocket()
  const [dashboardData, setDashboardData] = useState({
    stats: {
      teamsJoined: 0,
      hackathonsParticipated: 0,
      projectsCompleted: 0,
      skillsMatched: 0
    },
    recentActivity: [],
    upcomingHackathons: [],
    teamSuggestions: [],
    notifications: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/dashboard`, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDashboardData(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      // Set mock data for demo
      setDashboardData({
        stats: {
          teamsJoined: 3,
          hackathonsParticipated: 7,
          projectsCompleted: 5,
          skillsMatched: 12
        },
        recentActivity: [
          {
            id: 1,
            type: 'team_joined',
            message: 'You joined team "AI Innovators"',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            icon: Users
          },
          {
            id: 2,
            type: 'hackathon_registered',
            message: 'Registered for "Web3 Hackathon 2024"',
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
            icon: Calendar
          },
          {
            id: 3,
            type: 'skill_matched',
            message: 'New skill match found: React Developer',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            icon: Target
          }
        ],
        upcomingHackathons: [
          {
            id: 1,
            name: 'AI Innovation Challenge',
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            duration: '48 hours',
            participants: 250,
            status: 'registered'
          },
          {
            id: 2,
            name: 'Sustainable Tech Hackathon',
            startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            duration: '72 hours',
            participants: 180,
            status: 'open'
          }
        ],
        teamSuggestions: [
          {
            id: 1,
            name: 'Frontend Masters',
            members: 3,
            skills: ['React', 'TypeScript', 'UI/UX'],
            matchScore: 0.92
          },
          {
            id: 2,
            name: 'Data Wizards',
            members: 2,
            skills: ['Python', 'Machine Learning', 'Data Science'],
            matchScore: 0.87
          }
        ],
        notifications: [
          {
            id: 1,
            title: 'Team invitation received',
            message: 'You have been invited to join "Code Crushers"',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            unread: true
          },
          {
            id: 2,
            title: 'Hackathon reminder',
            message: 'AI Innovation Challenge starts in 7 days',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            unread: false
          }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (date) => {
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome back, {user?.firstName}!
              </h1>
              <p className="text-muted-foreground mt-1">
                Here's what's happening with your hackathon journey
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={connected ? 'default' : 'secondary'}>
                <Activity className="w-3 h-3 mr-1" />
                {connected ? 'Live' : 'Offline'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teams Joined</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.stats.teamsJoined}</div>
              <p className="text-xs text-muted-foreground">
                +2 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hackathons</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.stats.hackathonsParticipated}</div>
              <p className="text-xs text-muted-foreground">
                +1 this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.stats.projectsCompleted}</div>
              <p className="text-xs text-muted-foreground">
                3 won prizes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skill Matches</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.stats.skillsMatched}</div>
              <p className="text-xs text-muted-foreground">
                92% compatibility
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="hackathons">Hackathons</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Suggestions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Team Suggestions
                  </CardTitle>
                  <CardDescription>
                    AI-powered team matches based on your skills
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dashboardData.teamSuggestions.map((team) => (
                    <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{team.name}</h4>
                          <Badge variant="secondary">{team.members} members</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {team.skills.slice(0, 3).map((skill) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Progress value={team.matchScore * 100} className="flex-1 h-2" />
                          <span className="text-sm text-muted-foreground">
                            {Math.round(team.matchScore * 100)}%
                          </span>
                        </div>
                      </div>
                      <Button size="sm" className="ml-4">
                        Connect
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/teams">
                      View All Teams
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Upcoming Hackathons */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Upcoming Hackathons
                  </CardTitle>
                  <CardDescription>
                    Events you're registered for or might be interested in
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dashboardData.upcomingHackathons.map((hackathon) => (
                    <div key={hackathon.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{hackathon.name}</h4>
                        <Badge variant={hackathon.status === 'registered' ? 'default' : 'secondary'}>
                          {hackathon.status}
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground space-x-4">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatDate(hackathon.startDate)}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {hackathon.participants} participants
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/hackathons">
                      Browse All Hackathons
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Your latest actions and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentActivity.map((activity) => {
                    const Icon = activity.icon
                    return (
                      <div key={activity.id} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams">
            <Card>
              <CardHeader>
                <CardTitle>Your Teams</CardTitle>
                <CardDescription>
                  Teams you're currently part of and team invitations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No teams yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Join a team or create your own to start collaborating
                  </p>
                  <Button asChild>
                    <Link to="/teams">Find Teams</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hackathons">
            <Card>
              <CardHeader>
                <CardTitle>Your Hackathons</CardTitle>
                <CardDescription>
                  Hackathons you're registered for and past participations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No hackathons yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Register for hackathons to start building amazing projects
                  </p>
                  <Button asChild>
                    <Link to="/hackathons">Browse Hackathons</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity Feed</CardTitle>
                <CardDescription>
                  All your recent activities and notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentActivity.map((activity) => {
                    const Icon = activity.icon
                    return (
                      <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default DashboardPage

