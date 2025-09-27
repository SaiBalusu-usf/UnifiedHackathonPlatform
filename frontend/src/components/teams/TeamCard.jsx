import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  MapPin, 
  Clock, 
  Star, 
  Trophy,
  Code,
  Palette,
  Database,
  Smartphone
} from 'lucide-react'

const TeamCard = ({ team, matchScore }) => {
  const getSkillIcon = (skill) => {
    const skillLower = skill.toLowerCase()
    if (skillLower.includes('design') || skillLower.includes('ui') || skillLower.includes('ux')) {
      return Palette
    }
    if (skillLower.includes('mobile') || skillLower.includes('ios') || skillLower.includes('android')) {
      return Smartphone
    }
    if (skillLower.includes('database') || skillLower.includes('sql') || skillLower.includes('mongo')) {
      return Database
    }
    return Code
  }

  const formatTimeAgo = (date) => {
    const now = new Date()
    const diff = now - new Date(date)
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-xl font-bold text-foreground">{team.name}</h3>
              {team.verified && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                {team.currentMembers}/{team.maxMembers} members
              </div>
              {team.location && (
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {team.location}
                </div>
              )}
              {team.lastActive && (
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatTimeAgo(team.lastActive)}
                </div>
              )}
            </div>

            {/* Match Score */}
            {matchScore && (
              <div className="mb-4">
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
        {/* Team Description */}
        {team.description && (
          <div>
            <p className="text-muted-foreground leading-relaxed">
              {team.description}
            </p>
          </div>
        )}

        {/* Current Project */}
        {team.currentProject && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="font-medium">Current Project</span>
            </div>
            <h4 className="font-semibold mb-1">{team.currentProject.name}</h4>
            <p className="text-sm text-muted-foreground">
              {team.currentProject.description}
            </p>
            {team.currentProject.hackathon && (
              <Badge variant="outline" className="mt-2">
                {team.currentProject.hackathon}
              </Badge>
            )}
          </div>
        )}

        {/* Team Members */}
        {team.members && team.members.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Team Members
            </h4>
            <div className="space-y-3">
              {team.members.slice(0, 3).map((member, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      {member.role === 'leader' && (
                        <Badge variant="secondary" className="text-xs">Leader</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.title || member.primarySkill}
                    </p>
                  </div>
                </div>
              ))}
              {team.members.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{team.members.length - 3} more members
                </div>
              )}
            </div>
          </div>
        )}

        {/* Skills Needed */}
        {team.skillsNeeded && team.skillsNeeded.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center">
              <Code className="w-4 h-4 mr-2" />
              Looking For
            </h4>
            <div className="flex flex-wrap gap-2">
              {team.skillsNeeded.map((skill, index) => {
                const SkillIcon = getSkillIcon(skill)
                return (
                  <Badge key={index} variant="outline" className="flex items-center space-x-1">
                    <SkillIcon className="w-3 h-3" />
                    <span>{skill}</span>
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Team Skills */}
        {team.teamSkills && team.teamSkills.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Team Skills</h4>
            <div className="flex flex-wrap gap-2">
              {team.teamSkills.slice(0, 8).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {team.teamSkills.length > 8 && (
                <Badge variant="outline" className="text-xs">
                  +{team.teamSkills.length - 8} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Team Stats */}
        {team.stats && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">
                {team.stats.projectsCompleted || 0}
              </div>
              <div className="text-xs text-muted-foreground">Projects</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">
                {team.stats.hackathonsWon || 0}
              </div>
              <div className="text-xs text-muted-foreground">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">
                {team.stats.avgRating || 0}★
              </div>
              <div className="text-xs text-muted-foreground">Rating</div>
            </div>
          </div>
        )}

        {/* Join Requirements */}
        {team.requirements && team.requirements.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
            <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">
              Requirements
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              {team.requirements.map((req, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </>
  )
}

export default TeamCard

