import { ProfileParsingAgent } from '../../agents/ProfileParsingAgent'
import { SkillMatchingAgent } from '../../agents/SkillMatchingAgent'
import { TeamFormingAgent } from '../../agents/TeamFormingAgent'
import { AgentManager } from '../../agents/AgentManager'
import { eventBus } from '../../shared/events/eventBus'

describe('AI Agents Unit Tests', () => {
  let profileAgent: ProfileParsingAgent
  let skillAgent: SkillMatchingAgent
  let teamAgent: TeamFormingAgent
  let agentManager: AgentManager

  beforeEach(() => {
    profileAgent = new ProfileParsingAgent('profile-agent-1')
    skillAgent = new SkillMatchingAgent('skill-agent-1')
    teamAgent = new TeamFormingAgent('team-agent-1')
    agentManager = new AgentManager()
  })

  afterEach(() => {
    agentManager.shutdown()
  })

  describe('ProfileParsingAgent', () => {
    it('should initialize with correct properties', () => {
      expect(profileAgent.getId()).toBe('profile-agent-1')
      expect(profileAgent.getType()).toBe('ProfileParsingAgent')
      expect(profileAgent.getStatus()).toBe('idle')
      expect(profileAgent.isHealthy()).toBe(true)
    })

    it('should parse resume text and extract skills', async () => {
      const resumeText = `
        John Doe
        Software Engineer
        
        Experience:
        - 5 years of JavaScript development
        - React and Node.js expertise
        - AWS cloud services
        - Docker containerization
        
        Education:
        - BS Computer Science, MIT
        
        Skills: Python, TypeScript, PostgreSQL, MongoDB
      `

      const result = await profileAgent.parseResume(resumeText, 'text/plain')

      expect(result).toMatchObject({
        success: true,
        data: {
          skills: expect.arrayContaining([
            'JavaScript', 'React', 'Node.js', 'AWS', 'Docker',
            'Python', 'TypeScript', 'PostgreSQL', 'MongoDB'
          ]),
          experience: expect.arrayContaining([
            expect.objectContaining({
              title: expect.stringContaining('Software Engineer'),
              duration: expect.any(String)
            })
          ]),
          education: expect.arrayContaining([
            expect.objectContaining({
              degree: expect.stringContaining('BS Computer Science'),
              institution: 'MIT'
            })
          ]),
          summary: expect.any(String)
        },
        confidence: expect.any(Number)
      })

      expect(result.confidence).toBeGreaterThan(0.8)
    })

    it('should handle invalid resume format', async () => {
      const result = await profileAgent.parseResume('', 'text/plain')

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('empty or invalid')
      })
    })

    it('should normalize and categorize skills', () => {
      const skills = ['javascript', 'JS', 'react.js', 'reactjs', 'node', 'nodejs']
      const normalized = profileAgent.normalizeSkills(skills)

      expect(normalized).toContain('JavaScript')
      expect(normalized).toContain('React')
      expect(normalized).toContain('Node.js')
      expect(normalized).not.toContain('javascript')
      expect(normalized).not.toContain('JS')
    })

    it('should extract experience from text', () => {
      const text = `
        Senior Software Engineer at Google (2020-2023)
        - Led team of 5 developers
        - Built scalable microservices
        
        Junior Developer at Startup Inc (2018-2020)
        - Full-stack development
      `

      const experience = profileAgent.extractExperience(text)

      expect(experience).toHaveLength(2)
      expect(experience[0]).toMatchObject({
        title: 'Senior Software Engineer',
        company: 'Google',
        duration: '2020-2023',
        description: expect.stringContaining('Led team')
      })
    })

    it('should track processing metrics', async () => {
      const resumeText = 'Sample resume with JavaScript and React skills'
      
      await profileAgent.parseResume(resumeText, 'text/plain')
      
      const metrics = profileAgent.getMetrics()
      expect(metrics.totalProcessed).toBe(1)
      expect(metrics.successRate).toBe(100)
      expect(metrics.averageProcessingTime).toBeGreaterThan(0)
    })
  })

  describe('SkillMatchingAgent', () => {
    it('should initialize with correct properties', () => {
      expect(skillAgent.getId()).toBe('skill-agent-1')
      expect(skillAgent.getType()).toBe('SkillMatchingAgent')
      expect(skillAgent.getStatus()).toBe('idle')
    })

    it('should calculate compatibility between users', async () => {
      const user1 = {
        id: 'user1',
        skills: ['JavaScript', 'React', 'Node.js', 'Python'],
        experience: 3,
        preferences: { teamSize: 4, remote: true }
      }

      const user2 = {
        id: 'user2',
        skills: ['JavaScript', 'Vue.js', 'Python', 'Docker'],
        experience: 2,
        preferences: { teamSize: 4, remote: true }
      }

      const compatibility = await skillAgent.calculateCompatibility(user1, user2)

      expect(compatibility).toMatchObject({
        score: expect.any(Number),
        breakdown: {
          skillOverlap: expect.any(Number),
          complementarySkills: expect.any(Number),
          experienceBalance: expect.any(Number),
          preferenceAlignment: expect.any(Number)
        },
        sharedSkills: expect.arrayContaining(['JavaScript', 'Python']),
        complementarySkills: expect.arrayContaining(['React', 'Vue.js', 'Docker'])
      })

      expect(compatibility.score).toBeGreaterThan(0)
      expect(compatibility.score).toBeLessThanOrEqual(100)
    })

    it('should find skill matches for a user', async () => {
      const targetUser = {
        id: 'target',
        skills: ['JavaScript', 'React'],
        experience: 2
      }

      const candidates = [
        {
          id: 'candidate1',
          skills: ['JavaScript', 'Vue.js', 'Node.js'],
          experience: 3
        },
        {
          id: 'candidate2',
          skills: ['Python', 'Django'],
          experience: 1
        },
        {
          id: 'candidate3',
          skills: ['JavaScript', 'React', 'TypeScript'],
          experience: 4
        }
      ]

      const matches = await skillAgent.findMatches(targetUser, candidates, { limit: 2 })

      expect(matches).toHaveLength(2)
      expect(matches[0].compatibility.score).toBeGreaterThanOrEqual(matches[1].compatibility.score)
      expect(matches[0].user.id).toBe('candidate3') // Should have highest compatibility
    })

    it('should handle empty candidate list', async () => {
      const targetUser = {
        id: 'target',
        skills: ['JavaScript'],
        experience: 1
      }

      const matches = await skillAgent.findMatches(targetUser, [], {})

      expect(matches).toHaveLength(0)
    })

    it('should apply filters correctly', async () => {
      const targetUser = {
        id: 'target',
        skills: ['JavaScript'],
        experience: 2
      }

      const candidates = [
        { id: 'candidate1', skills: ['JavaScript'], experience: 1 },
        { id: 'candidate2', skills: ['JavaScript'], experience: 3 },
        { id: 'candidate3', skills: ['JavaScript'], experience: 5 }
      ]

      const matches = await skillAgent.findMatches(targetUser, candidates, {
        minExperience: 2,
        maxExperience: 4
      })

      expect(matches).toHaveLength(2)
      expect(matches.every(m => m.user.experience >= 2 && m.user.experience <= 4)).toBe(true)
    })
  })

  describe('TeamFormingAgent', () => {
    it('should initialize with correct properties', () => {
      expect(teamAgent.getId()).toBe('team-agent-1')
      expect(teamAgent.getType()).toBe('TeamFormingAgent')
      expect(teamAgent.getStatus()).toBe('idle')
    })

    it('should form optimal team from candidates', async () => {
      const requirements = {
        teamSize: 4,
        requiredSkills: ['JavaScript', 'Python', 'Design', 'Marketing'],
        hackathonId: 'hackathon-1'
      }

      const candidates = [
        { id: 'user1', skills: ['JavaScript', 'React'], experience: 3 },
        { id: 'user2', skills: ['Python', 'Django'], experience: 2 },
        { id: 'user3', skills: ['Design', 'Figma'], experience: 4 },
        { id: 'user4', skills: ['Marketing', 'SEO'], experience: 1 },
        { id: 'user5', skills: ['JavaScript', 'Vue.js'], experience: 2 },
        { id: 'user6', skills: ['Python', 'Flask'], experience: 3 }
      ]

      const result = await teamAgent.formTeam(requirements, candidates)

      expect(result).toMatchObject({
        success: true,
        team: {
          members: expect.any(Array),
          skillCoverage: expect.any(Number),
          diversityScore: expect.any(Number),
          compatibilityScore: expect.any(Number),
          overallScore: expect.any(Number)
        }
      })

      expect(result.team.members).toHaveLength(4)
      expect(result.team.skillCoverage).toBeGreaterThan(0.8) // Should cover most required skills
      expect(result.team.overallScore).toBeGreaterThan(0.7) // Should be a good team
    })

    it('should handle insufficient candidates', async () => {
      const requirements = {
        teamSize: 5,
        requiredSkills: ['JavaScript'],
        hackathonId: 'hackathon-1'
      }

      const candidates = [
        { id: 'user1', skills: ['JavaScript'], experience: 1 },
        { id: 'user2', skills: ['Python'], experience: 2 }
      ]

      const result = await teamAgent.formTeam(requirements, candidates)

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('insufficient candidates')
      })
    })

    it('should optimize team composition using genetic algorithm', async () => {
      const candidates = Array.from({ length: 20 }, (_, i) => ({
        id: `user${i}`,
        skills: ['JavaScript', 'Python', 'React', 'Node.js'].slice(0, Math.floor(Math.random() * 4) + 1),
        experience: Math.floor(Math.random() * 5) + 1
      }))

      const requirements = {
        teamSize: 5,
        requiredSkills: ['JavaScript', 'Python'],
        hackathonId: 'hackathon-1'
      }

      const result = await teamAgent.formTeam(requirements, candidates)

      expect(result.success).toBe(true)
      expect(result.team.members).toHaveLength(5)
      
      // Check that the genetic algorithm improved the solution
      const initialScore = teamAgent.calculateTeamScore(
        candidates.slice(0, 5),
        requirements.requiredSkills
      )
      
      expect(result.team.overallScore).toBeGreaterThanOrEqual(initialScore)
    })

    it('should calculate team diversity correctly', () => {
      const team = [
        { id: 'user1', skills: ['JavaScript'], experience: 1 },
        { id: 'user2', skills: ['Python'], experience: 3 },
        { id: 'user3', skills: ['Design'], experience: 2 },
        { id: 'user4', skills: ['Marketing'], experience: 4 }
      ]

      const diversityScore = teamAgent.calculateDiversity(team)

      expect(diversityScore).toBeGreaterThan(0.8) // High diversity
      expect(diversityScore).toBeLessThanOrEqual(1.0)
    })
  })

  describe('AgentManager', () => {
    it('should register and manage agents', () => {
      agentManager.registerAgent(profileAgent)
      agentManager.registerAgent(skillAgent)
      agentManager.registerAgent(teamAgent)

      const agents = agentManager.getAgents()
      expect(agents).toHaveLength(3)
      expect(agents.map(a => a.getId())).toContain('profile-agent-1')
      expect(agents.map(a => a.getId())).toContain('skill-agent-1')
      expect(agents.map(a => a.getId())).toContain('team-agent-1')
    })

    it('should start and stop agents', async () => {
      agentManager.registerAgent(profileAgent)
      
      await agentManager.startAgent('profile-agent-1')
      expect(profileAgent.getStatus()).toBe('running')

      await agentManager.stopAgent('profile-agent-1')
      expect(profileAgent.getStatus()).toBe('stopped')
    })

    it('should handle agent errors gracefully', async () => {
      const faultyAgent = new ProfileParsingAgent('faulty-agent')
      
      // Mock a method to throw an error
      jest.spyOn(faultyAgent, 'parseResume').mockRejectedValue(new Error('Test error'))
      
      agentManager.registerAgent(faultyAgent)
      await agentManager.startAgent('faulty-agent')

      // Agent should still be registered but marked as unhealthy
      const agent = agentManager.getAgent('faulty-agent')
      expect(agent).toBeDefined()
    })

    it('should provide system statistics', () => {
      agentManager.registerAgent(profileAgent)
      agentManager.registerAgent(skillAgent)
      agentManager.registerAgent(teamAgent)

      const stats = agentManager.getSystemStats()

      expect(stats).toMatchObject({
        totalAgents: 3,
        runningAgents: 0,
        healthyAgents: 3,
        totalTasksProcessed: 0,
        averageResponseTime: 0
      })
    })

    it('should handle concurrent task processing', async () => {
      agentManager.registerAgent(profileAgent)
      await agentManager.startAgent('profile-agent-1')

      const tasks = Array.from({ length: 5 }, (_, i) => 
        agentManager.processTask('profile-agent-1', 'parseResume', {
          text: `Resume ${i} with JavaScript skills`,
          mimeType: 'text/plain'
        })
      )

      const results = await Promise.all(tasks)
      
      expect(results).toHaveLength(5)
      expect(results.every(r => r.success)).toBe(true)
    })

    it('should monitor agent health', async () => {
      agentManager.registerAgent(profileAgent)
      await agentManager.startAgent('profile-agent-1')

      const healthCheck = await agentManager.checkAgentHealth('profile-agent-1')

      expect(healthCheck).toMatchObject({
        agentId: 'profile-agent-1',
        status: 'running',
        healthy: true,
        uptime: expect.any(Number),
        memoryUsage: expect.any(Object),
        lastActivity: expect.any(Date)
      })
    })
  })

  describe('Event Integration', () => {
    it('should publish events when agents process tasks', async () => {
      const eventSpy = jest.spyOn(eventBus, 'publish')
      
      agentManager.registerAgent(profileAgent)
      await agentManager.startAgent('profile-agent-1')

      await agentManager.processTask('profile-agent-1', 'parseResume', {
        text: 'Sample resume with JavaScript skills',
        mimeType: 'text/plain'
      })

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'agent_task_started'
        })
      )

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'agent_task_completed'
        })
      )

      eventSpy.mockRestore()
    })

    it('should handle event-driven task requests', async () => {
      agentManager.registerAgent(profileAgent)
      await agentManager.startAgent('profile-agent-1')

      // Simulate an event that triggers agent processing
      await eventBus.publish({
        id: 'test-event',
        type: 'resume_uploaded' as any,
        timestamp: new Date(),
        source: 'test',
        version: '1.0',
        data: {
          resumeId: 'resume-123',
          userId: 'user-123',
          text: 'Resume with Python and React skills'
        }
      })

      // Give some time for event processing
      await new Promise(resolve => setTimeout(resolve, 100))

      const metrics = profileAgent.getMetrics()
      expect(metrics.totalProcessed).toBeGreaterThan(0)
    })
  })
})

