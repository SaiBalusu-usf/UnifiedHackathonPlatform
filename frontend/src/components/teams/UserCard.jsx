import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  MapPin, 
  Clock, 
  Star, 
  Trophy,
  Code,
  Briefcase,
  GraduationCap,
  Github,
  Linkedin,
  Globe,
  Calendar,
  Award
} from 'lucide-react'

const UserCard = ({ user, matchScore }) => {
  const formatTimeAgo = (date) => {
    const now = new Date()
    const diff = now - new Date(date)
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getExperienceLevel = (years) => {
    if (years < 1) return 'Entry Level'
    if (years < 3) return 'Junior'
    if (years < 5) return 'Mid-Level'
    if (years < 8) return 'Senior'
    return 'Expert'
  }

  const getSkillCategory = (skill) => {
    const skillLower = skill.toLowerCase()
    if (['javascript', 'typescript', 'react', 'vue', 'angular', 'html', 'css'].some(s => skillLower.includes(s))) {
      return 'Frontend'
    }
    if (['node.js', 'python', 'java', 'go', 'rust', 'php'].some(s => skillLower.includes(s))) {
      return 'Backend'
    }
    if (['ui', 'ux', 'design', 'figma', 'photoshop'].some(s => skillLower.includes(s))) {
      return 'Design'
    }
    if (['ios', 'android', 'react native', 'flutter'].some(s => skillLower.includes(s))) {
      return 'Mobile'
    }
    if (['machine learning', 'ai', 'data science', 'tensorflow'].some(s => skillLower.includes(s))) {
      return 'AI/ML'
    }
    return 'Other'
  }

  return (
    <>
      <CardHeader className="pb-4">
        <div className="flex items-start space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-lg">
              {user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-xl font-bold text-foreground">{user.name}</h3>
              <Badge variant="outline" className="text-xs">
                {user.age || '25'}
              </Badge>
              {user.verified && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            
            <p className="text-muted-foreground mb-2">{user.title || 'Full Stack Developer'}</p>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              {user.location && (
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {user.location}
                </div>
              )}
              {user.lastActive && (
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatTimeAgo(user.lastActive)}
                </div>
              )}
              {user.experience && (
                <div className="flex items-center">
                  <Briefcase className="w-4 h-4 mr-1" />
                  {getExperienceLevel(user.experience)} ({user.experience}y)
                </div>
              )}
            </div>

            {/* Match Score */}
            {matchScore && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Compatibility</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(matchScore * 100)}%
                  </span>
                </div>
                <Progress value={matchScore * 100} className="h-2" />
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Bio */}
        {user.bio && (
          <div>
            <p className="text-muted-foreground leading-relaxed">
              {user.bio}
            </p>
          </div>
        )}

        {/* Skills */}
        {user.skills && user.skills.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center">
              <Code className="w-4 h-4 mr-2" />
              Skills & Technologies
            </h4>
            <div className="space-y-3">
              {/* Group skills by category */}
              {Object.entries(
                user.skills.reduce((acc, skill) => {
                  const category = getSkillCategory(skill)
                  if (!acc[category]) acc[category] = []
                  acc[category].push(skill)
                  return acc
                }, {})
              ).map(([category, skills]) => (
                <div key={category}>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    {category}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {user.workExperience && user.workExperience.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center">
              <Briefcase className="w-4 h-4 mr-2" />
              Work Experience
            </h4>
            <div className="space-y-3">
              {user.workExperience.slice(0, 2).map((exp, index) => (
                <div key={index} className="border-l-2 border-muted pl-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium">{exp.title}</h5>
                    <Badge variant="outline" className="text-xs">
                      {exp.duration || '2y'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                  {exp.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
              {user.workExperience.length > 2 && (
                <div className="text-xs text-muted-foreground">
                  +{user.workExperience.length - 2} more experiences
                </div>
              )}
            </div>
          </div>
        )}

        {/* Education */}
        {user.education && user.education.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center">
              <GraduationCap className="w-4 h-4 mr-2" />
              Education
            </h4>
            <div className="space-y-2">
              {user.education.slice(0, 2).map((edu, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{edu.degree}</p>
                    <p className="text-xs text-muted-foreground">{edu.school}</p>
                    {edu.year && (
                      <p className="text-xs text-muted-foreground">{edu.year}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interests */}
        {user.interests && user.interests.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Interests</h4>
            <div className="flex flex-wrap gap-2">
              {user.interests.slice(0, 6).map((interest, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {interest}
                </Badge>
              ))}
              {user.interests.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{user.interests.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Hackathon Stats */}
        {user.hackathonStats && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center">
              <Trophy className="w-4 h-4 mr-2" />
              Hackathon Experience
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">
                  {user.hackathonStats.participated || 0}
                </div>
                <div className="text-xs text-muted-foreground">Participated</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">
                  {user.hackathonStats.won || 0}
                </div>
                <div className="text-xs text-muted-foreground">Won</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">
                  {user.hackathonStats.rating || 4.5}★
                </div>
                <div className="text-xs text-muted-foreground">Rating</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Projects */}
        {user.recentProjects && user.recentProjects.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center">
              <Code className="w-4 h-4 mr-2" />
              Recent Projects
            </h4>
            <div className="space-y-3">
              {user.recentProjects.slice(0, 2).map((project, index) => (
                <div key={index} className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-medium text-sm">{project.name}</h5>
                    {project.award && (
                      <Badge variant="secondary" className="text-xs">
                        <Award className="w-3 h-3 mr-1" />
                        {project.award}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {project.description}
                  </p>
                  {project.technologies && (
                    <div className="flex flex-wrap gap-1">
                      {project.technologies.slice(0, 3).map((tech, techIndex) => (
                        <Badge key={techIndex} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Social Links */}
        {(user.github || user.linkedin || user.portfolio) && (
          <div>
            <h4 className="font-medium mb-3">Links</h4>
            <div className="flex space-x-4">
              {user.github && (
                <a
                  href={user.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="w-4 h-4" />
                  <span className="text-sm">GitHub</span>
                </a>
              )}
              {user.linkedin && (
                <a
                  href={user.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                  <span className="text-sm">LinkedIn</span>
                </a>
              )}
              {user.portfolio && (
                <a
                  href={user.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">Portfolio</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Availability */}
        {user.availability && (
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-900 dark:text-green-100">
                Availability
              </span>
            </div>
            <p className="text-sm text-green-800 dark:text-green-200">
              {user.availability}
            </p>
          </div>
        )}
      </CardContent>
    </>
  )
}

export default UserCard

