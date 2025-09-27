import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import SwipeCard from '@/components/ui/swipe-card'
import TeamCard from '@/components/teams/TeamCard'
import UserCard from '@/components/teams/UserCard'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { 
  Heart, 
  X, 
  Star, 
  RotateCcw, 
  Settings, 
  Users, 
  User,
  Zap,
  Filter,
  Shuffle
} from 'lucide-react'

const TeamsPage = () => {
  const { user, API_BASE_URL, getAuthHeaders } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('teams')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    skills: [],
    location: '',
    experienceLevel: '',
    teamSize: [2, 6],
    hackathonType: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const cardRefs = useRef([])

  // Mock data for demonstration
  const mockTeams = [
    {
      id: 1,
      name: 'AI Innovators',
      description: 'We\'re building the next generation of AI-powered applications. Looking for passionate developers who want to push the boundaries of what\'s possible with machine learning.',
      currentMembers: 3,
      maxMembers: 5,
      location: 'San Francisco, CA',
      lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
      verified: true,
      skillsNeeded: ['Python', 'TensorFlow', 'React', 'UI/UX Design'],
      teamSkills: ['Machine Learning', 'Deep Learning', 'Python', 'JavaScript', 'Node.js'],
      members: [
        { name: 'Alice Johnson', role: 'leader', title: 'ML Engineer', avatar: null },
        { name: 'Bob Smith', role: 'member', title: 'Full Stack Dev', avatar: null },
        { name: 'Carol Davis', role: 'member', title: 'Data Scientist', avatar: null }
      ],
      currentProject: {
        name: 'SmartHealth AI',
        description: 'AI-powered health monitoring system',
        hackathon: 'HealthTech Hackathon 2024'
      },
      stats: {
        projectsCompleted: 8,
        hackathonsWon: 3,
        avgRating: 4.8
      },
      requirements: [
        'Experience with machine learning frameworks',
        'Commitment to work 20+ hours per week',
        'Available for weekend hackathons'
      ]
    },
    {
      id: 2,
      name: 'Frontend Masters',
      description: 'Passionate about creating beautiful, user-friendly interfaces. We specialize in modern web technologies and love crafting pixel-perfect designs.',
      currentMembers: 2,
      maxMembers: 4,
      location: 'Remote',
      lastActive: new Date(Date.now() - 5 * 60 * 60 * 1000),
      verified: false,
      skillsNeeded: ['React', 'TypeScript', 'Tailwind CSS', 'Figma'],
      teamSkills: ['React', 'Vue.js', 'CSS', 'JavaScript', 'UI/UX'],
      members: [
        { name: 'David Wilson', role: 'leader', title: 'Frontend Lead', avatar: null },
        { name: 'Emma Brown', role: 'member', title: 'UI Designer', avatar: null }
      ],
      currentProject: {
        name: 'EcoTracker',
        description: 'Sustainability tracking web app',
        hackathon: 'Green Tech Challenge'
      },
      stats: {
        projectsCompleted: 5,
        hackathonsWon: 1,
        avgRating: 4.5
      }
    },
    {
      id: 3,
      name: 'Blockchain Builders',
      description: 'Decentralizing the world one smart contract at a time. We\'re focused on building innovative DeFi and Web3 solutions.',
      currentMembers: 4,
      maxMembers: 6,
      location: 'New York, NY',
      lastActive: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      verified: true,
      skillsNeeded: ['Solidity', 'Web3.js', 'React', 'Smart Contracts'],
      teamSkills: ['Blockchain', 'Ethereum', 'Solidity', 'JavaScript', 'DeFi'],
      members: [
        { name: 'Frank Miller', role: 'leader', title: 'Blockchain Dev', avatar: null },
        { name: 'Grace Lee', role: 'member', title: 'Smart Contract Dev', avatar: null },
        { name: 'Henry Chen', role: 'member', title: 'Frontend Dev', avatar: null },
        { name: 'Ivy Wang', role: 'member', title: 'Product Manager', avatar: null }
      ],
      stats: {
        projectsCompleted: 12,
        hackathonsWon: 5,
        avgRating: 4.9
      }
    }
  ]

  const mockUsers = [
    {
      id: 1,
      name: 'Sarah Martinez',
      title: 'Full Stack Developer',
      age: 28,
      location: 'Austin, TX',
      lastActive: new Date(Date.now() - 1 * 60 * 60 * 1000),
      verified: true,
      bio: 'Passionate full-stack developer with 5 years of experience building scalable web applications. Love working on innovative projects that solve real-world problems.',
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'PostgreSQL', 'AWS', 'Docker'],
      experience: 5,
      workExperience: [
        {
          title: 'Senior Full Stack Developer',
          company: 'TechCorp Inc.',
          duration: '2y',
          description: 'Led development of microservices architecture serving 1M+ users'
        },
        {
          title: 'Software Engineer',
          company: 'StartupXYZ',
          duration: '3y',
          description: 'Built and maintained React applications with Node.js backends'
        }
      ],
      education: [
        {
          degree: 'BS Computer Science',
          school: 'University of Texas',
          year: '2019'
        }
      ],
      interests: ['Machine Learning', 'Open Source', 'Sustainability', 'Gaming'],
      hackathonStats: {
        participated: 12,
        won: 4,
        rating: 4.7
      },
      recentProjects: [
        {
          name: 'EcoTrack',
          description: 'Carbon footprint tracking app',
          technologies: ['React', 'Node.js', 'MongoDB'],
          award: '1st Place'
        },
        {
          name: 'DevCollab',
          description: 'Developer collaboration platform',
          technologies: ['Vue.js', 'Express', 'PostgreSQL']
        }
      ],
      github: 'https://github.com/sarahmartinez',
      linkedin: 'https://linkedin.com/in/sarahmartinez',
      portfolio: 'https://sarahmartinez.dev',
      availability: 'Available for weekend hackathons and part-time projects'
    },
    {
      id: 2,
      name: 'Alex Thompson',
      title: 'UI/UX Designer',
      age: 26,
      location: 'Seattle, WA',
      lastActive: new Date(Date.now() - 3 * 60 * 60 * 1000),
      verified: false,
      bio: 'Creative designer focused on user-centered design and accessibility. I believe great design should be both beautiful and functional.',
      skills: ['Figma', 'Adobe Creative Suite', 'Prototyping', 'User Research', 'HTML/CSS'],
      experience: 3,
      workExperience: [
        {
          title: 'UX Designer',
          company: 'Design Studio',
          duration: '2y',
          description: 'Designed user experiences for mobile and web applications'
        }
      ],
      education: [
        {
          degree: 'BA Graphic Design',
          school: 'Art Institute of Seattle',
          year: '2021'
        }
      ],
      interests: ['Accessibility', 'Design Systems', 'Photography', 'Travel'],
      hackathonStats: {
        participated: 8,
        won: 2,
        rating: 4.5
      },
      recentProjects: [
        {
          name: 'AccessiApp',
          description: 'Accessibility-first mobile app design',
          technologies: ['Figma', 'Principle', 'React Native'],
          award: 'Best Design'
        }
      ],
      portfolio: 'https://alexthompson.design',
      availability: 'Available evenings and weekends'
    }
  ]

  useEffect(() => {
    fetchCards()
  }, [activeTab])

  const fetchCards = async () => {
    setLoading(true)
    try {
      // In a real app, this would fetch from the API
      // const response = await fetch(`${API_BASE_URL}/${activeTab === 'teams' ? 'teams' : 'users'}/suggestions`, {
      //   headers: getAuthHeaders()
      // })
      
      // For demo, use mock data
      const data = activeTab === 'teams' ? mockTeams : mockUsers
      setCards(data.map(item => ({
        ...item,
        matchScore: Math.random() * 0.4 + 0.6 // Random match score between 0.6-1.0
      })))
      setCurrentIndex(0)
    } catch (error) {
      console.error('Failed to fetch cards:', error)
      toast({
        title: 'Error',
        description: 'Failed to load suggestions. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSwipeLeft = () => {
    const currentCard = cards[currentIndex]
    console.log('Passed on:', currentCard.name)
    
    toast({
      title: 'Passed',
      description: `You passed on ${currentCard.name}`,
    })
    
    nextCard()
  }

  const handleSwipeRight = () => {
    const currentCard = cards[currentIndex]
    console.log('Matched with:', currentCard.name)
    
    toast({
      title: 'Match!',
      description: `You matched with ${currentCard.name}! 🎉`,
    })
    
    nextCard()
  }

  const handleSwipeUp = () => {
    const currentCard = cards[currentIndex]
    console.log('Super matched with:', currentCard.name)
    
    toast({
      title: 'Super Match!',
      description: `You super matched with ${currentCard.name}! ⭐`,
    })
    
    nextCard()
  }

  const nextCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // No more cards
      toast({
        title: 'No more suggestions',
        description: 'You\'ve seen all available suggestions. Try adjusting your filters.',
      })
    }
  }

  const handleButtonSwipe = (direction) => {
    const currentCardRef = cardRefs.current[currentIndex]
    if (currentCardRef) {
      if (direction === 'left') {
        currentCardRef.swipeLeft()
      } else if (direction === 'right') {
        currentCardRef.swipeRight()
      } else if (direction === 'up') {
        currentCardRef.swipeUp()
      }
    }
  }

  const resetCards = () => {
    setCurrentIndex(0)
    toast({
      title: 'Cards reset',
      description: 'Starting over with fresh suggestions',
    })
  }

  const shuffleCards = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5)
    setCards(shuffled)
    setCurrentIndex(0)
    toast({
      title: 'Cards shuffled',
      description: 'Showing suggestions in a new order',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  const currentCard = cards[currentIndex]
  const hasMoreCards = currentIndex < cards.length - 1

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Find Your Perfect Match</h1>
          <p className="text-muted-foreground">
            Swipe through {activeTab === 'teams' ? 'teams' : 'developers'} and find your ideal collaborators
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="teams" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Find Teams</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Find Teammates</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Controls */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" size="sm" onClick={shuffleCards}>
              <Shuffle className="w-4 h-4 mr-2" />
              Shuffle
            </Button>
            <Button variant="outline" size="sm" onClick={resetCards}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} of {cards.length}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="Enter location..."
                    value={filters.location}
                    onChange={(e) => setFilters({...filters, location: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="experience">Experience Level</Label>
                  <Select value={filters.experienceLevel} onValueChange={(value) => setFilters({...filters, experienceLevel: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="junior">Junior</SelectItem>
                      <SelectItem value="mid">Mid-Level</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="hackathon">Hackathon Type</Label>
                  <Select value={filters.hackathonType} onValueChange={(value) => setFilters({...filters, hackathonType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Web Development</SelectItem>
                      <SelectItem value="mobile">Mobile Apps</SelectItem>
                      <SelectItem value="ai">AI/ML</SelectItem>
                      <SelectItem value="blockchain">Blockchain</SelectItem>
                      <SelectItem value="iot">IoT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Swipe Area */}
        <div className="relative">
          {currentCard ? (
            <div className="max-w-md mx-auto">
              {/* Card Stack Effect */}
              <div className="relative">
                {/* Background cards for stack effect */}
                {hasMoreCards && (
                  <>
                    <div className="absolute inset-0 bg-card border rounded-lg transform translate-y-2 translate-x-1 opacity-30" />
                    <div className="absolute inset-0 bg-card border rounded-lg transform translate-y-1 translate-x-0.5 opacity-60" />
                  </>
                )}
                
                {/* Current card */}
                <SwipeCard
                  ref={(el) => cardRefs.current[currentIndex] = el}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={handleSwipeRight}
                  onSwipeUp={handleSwipeUp}
                  className="relative z-10"
                >
                  {activeTab === 'teams' ? (
                    <TeamCard team={currentCard} matchScore={currentCard.matchScore} />
                  ) : (
                    <UserCard user={currentCard} matchScore={currentCard.matchScore} />
                  )}
                </SwipeCard>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-16 h-16 rounded-full border-red-200 hover:bg-red-50 hover:border-red-300"
                  onClick={() => handleButtonSwipe('left')}
                >
                  <X className="w-6 h-6 text-red-500" />
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="w-16 h-16 rounded-full border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                  onClick={() => handleButtonSwipe('up')}
                >
                  <Star className="w-6 h-6 text-blue-500" />
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="w-16 h-16 rounded-full border-green-200 hover:bg-green-50 hover:border-green-300"
                  onClick={() => handleButtonSwipe('right')}
                >
                  <Heart className="w-6 h-6 text-green-500" />
                </Button>
              </div>

              {/* Instructions */}
              <div className="text-center mt-6 text-sm text-muted-foreground">
                <p>Swipe left to pass • Swipe right to match • Swipe up for super match</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No more suggestions</h3>
              <p className="text-muted-foreground mb-4">
                You've seen all available {activeTab === 'teams' ? 'teams' : 'developers'}. 
                Try adjusting your filters or check back later for new suggestions.
              </p>
              <Button onClick={resetCards}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TeamsPage

