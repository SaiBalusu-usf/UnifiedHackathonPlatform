import Agent, { AgentConfig } from './base/Agent';
import { Event } from '../shared/types';
import { EventTypes } from '../shared/events/eventBus';
import { pgPool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

interface TeamFormationRequest {
  requesterId: string;
  hackathonId: string;
  teamName?: string;
  desiredTeamSize: number;
  requiredSkills: string[];
  preferredSkills: string[];
  projectDescription?: string;
  targetUsers?: string[];
  autoInvite: boolean;
}

interface OptimalTeamComposition {
  members: TeamMember[];
  skillCoverage: number;
  diversityScore: number;
  compatibilityScore: number;
  totalScore: number;
}

interface TeamMember {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  skills: string[];
  interests: string[];
  role: 'leader' | 'member';
  contributionScore: number;
}

export class TeamFormingAgent extends Agent {
  private readonly MAX_TEAM_SIZE = 6;
  private readonly MIN_TEAM_SIZE = 2;
  private readonly SKILL_COVERAGE_WEIGHT = 0.4;
  private readonly DIVERSITY_WEIGHT = 0.3;
  private readonly COMPATIBILITY_WEIGHT = 0.3;

  constructor() {
    const config: AgentConfig = {
      name: 'TeamFormingAgent',
      description: 'Assists in creating balanced and effective teams using optimization algorithms and team dynamics analysis',
      subscribeToEvents: [EventTypes.TEAM_FORMATION_REQUEST, EventTypes.TEAM_SUGGESTIONS_GENERATED],
      publishEvents: [EventTypes.TEAM_FORMED, EventTypes.TEAM_MEMBER_ADDED, EventTypes.NOTIFICATION_SEND],
      enabled: true
    };
    super(config);
  }

  protected async processEvent(event: Event): Promise<void> {
    switch (event.type) {
      case EventTypes.TEAM_FORMATION_REQUEST:
        await this.handleTeamFormationRequest(event);
        break;
      case EventTypes.TEAM_SUGGESTIONS_GENERATED:
        await this.evaluateTeamSuggestions(event);
        break;
    }
  }

  private async handleTeamFormationRequest(event: Event): Promise<void> {
    const request = event.payload as TeamFormationRequest;

    if (!this.validateEventPayload(event, ['requesterId', 'hackathonId', 'desiredTeamSize'])) {
      this.logError('Invalid team formation request payload');
      return;
    }

    try {
      this.logInfo(`Processing team formation request from user: ${request.requesterId}`);

      // Validate team size
      if (request.desiredTeamSize < this.MIN_TEAM_SIZE || request.desiredTeamSize > this.MAX_TEAM_SIZE) {
        this.logError(`Invalid team size: ${request.desiredTeamSize}. Must be between ${this.MIN_TEAM_SIZE} and ${this.MAX_TEAM_SIZE}`);
        return;
      }

      // Check if user is already in a team for this hackathon
      const existingTeam = await this.checkExistingTeamMembership(request.requesterId, request.hackathonId);
      if (existingTeam) {
        this.logInfo(`User ${request.requesterId} is already in team ${existingTeam.teamId} for hackathon ${request.hackathonId}`);
        return;
      }

      // Get available candidates
      const candidates = await this.getAvailableCandidates(request);
      
      if (candidates.length < request.desiredTeamSize - 1) {
        this.logError(`Insufficient candidates available. Found ${candidates.length}, need ${request.desiredTeamSize - 1}`);
        return;
      }

      // Find optimal team composition
      const optimalTeam = await this.findOptimalTeamComposition(request, candidates);

      if (optimalTeam.totalScore < 0.5) {
        this.logInfo(`Optimal team score too low (${optimalTeam.totalScore}). Suggesting manual team formation.`);
        await this.suggestManualTeamFormation(request, candidates);
        return;
      }

      // Create the team
      const teamId = await this.createTeam(request, optimalTeam);

      if (teamId) {
        // Send invitations or add members directly
        if (request.autoInvite) {
          await this.addMembersToTeam(teamId, optimalTeam.members);
        } else {
          await this.sendTeamInvitations(teamId, optimalTeam.members, request);
        }

        // Publish team formed event
        this.publishEvent(EventTypes.TEAM_FORMED, {
          teamId,
          hackathonId: request.hackathonId,
          requesterId: request.requesterId,
          members: optimalTeam.members.map(m => m.userId),
          teamComposition: optimalTeam,
          timestamp: new Date()
        });

        this.logInfo(`Successfully formed team ${teamId} with ${optimalTeam.members.length} members`);
      }

    } catch (error) {
      this.logError(`Failed to process team formation request for user: ${request.requesterId}`, error);
    }
  }

  private async getAvailableCandidates(request: TeamFormationRequest): Promise<TeamMember[]> {
    try {
      let query = `
        SELECT DISTINCT u.user_id, u.username, u.first_name, u.last_name, u.email,
               p.skills, p.interests
        FROM users u
        JOIN profiles p ON u.user_id = p.user_id
        WHERE u.user_id != $1
        AND u.role = 'participant'
        AND u.user_id NOT IN (
          SELECT tm.user_id FROM team_members tm
          JOIN teams t ON tm.team_id = t.team_id
          WHERE t.hackathon_id = $2
        )
      `;

      const queryParams: any[] = [request.requesterId, request.hackathonId];
      let paramIndex = 3;

      // Filter by target users if specified
      if (request.targetUsers && request.targetUsers.length > 0) {
        query += ` AND u.user_id IN (${request.targetUsers.map(() => `$${paramIndex++}`).join(',')})`;
        queryParams.push(...request.targetUsers);
      }

      query += ` ORDER BY u.created_at DESC LIMIT 50`;

      const result = await pgPool.query(query, queryParams);
      
      return result.rows.map(row => ({
        userId: row.user_id,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        skills: row.skills || [],
        interests: row.interests || [],
        role: 'member' as const,
        contributionScore: 0
      }));

    } catch (error) {
      this.logError('Failed to get available candidates', error);
      return [];
    }
  }

  private async findOptimalTeamComposition(request: TeamFormationRequest, candidates: TeamMember[]): Promise<OptimalTeamComposition> {
    const requester = await this.getRequesterProfile(request.requesterId);
    if (!requester) {
      throw new Error('Requester profile not found');
    }

    // Add requester as team leader
    requester.role = 'leader';
    
    const teamSize = request.desiredTeamSize;
    const neededMembers = teamSize - 1; // Excluding the requester

    // Use genetic algorithm approach for team optimization
    const bestComposition = await this.geneticAlgorithmOptimization(
      requester,
      candidates,
      neededMembers,
      request
    );

    return bestComposition;
  }

  private async geneticAlgorithmOptimization(
    leader: TeamMember,
    candidates: TeamMember[],
    neededMembers: number,
    request: TeamFormationRequest
  ): Promise<OptimalTeamComposition> {
    const POPULATION_SIZE = 20;
    const GENERATIONS = 10;
    const MUTATION_RATE = 0.1;

    // Generate initial population
    let population = this.generateInitialPopulation(candidates, neededMembers, POPULATION_SIZE);

    for (let generation = 0; generation < GENERATIONS; generation++) {
      // Evaluate fitness for each team composition
      const evaluatedPopulation = population.map(team => {
        const fullTeam = [leader, ...team];
        return this.evaluateTeamComposition(fullTeam, request);
      });

      // Sort by fitness (total score)
      evaluatedPopulation.sort((a, b) => b.totalScore - a.totalScore);

      // Select top performers for next generation
      const survivors = evaluatedPopulation.slice(0, Math.floor(POPULATION_SIZE / 2));

      // Generate new population through crossover and mutation
      population = [];
      
      // Keep best performers
      population.push(...survivors.map(s => s.members.filter(m => m.role !== 'leader')));

      // Generate offspring through crossover
      while (population.length < POPULATION_SIZE) {
        const parent1 = survivors[Math.floor(Math.random() * survivors.length)];
        const parent2 = survivors[Math.floor(Math.random() * survivors.length)];
        
        const offspring = this.crossover(
          parent1.members.filter(m => m.role !== 'leader'),
          parent2.members.filter(m => m.role !== 'leader'),
          candidates,
          neededMembers
        );

        // Apply mutation
        if (Math.random() < MUTATION_RATE) {
          this.mutate(offspring, candidates);
        }

        population.push(offspring);
      }
    }

    // Return the best team composition
    const finalEvaluation = population.map(team => {
      const fullTeam = [leader, ...team];
      return this.evaluateTeamComposition(fullTeam, request);
    });

    return finalEvaluation.reduce((best, current) => 
      current.totalScore > best.totalScore ? current : best
    );
  }

  private generateInitialPopulation(candidates: TeamMember[], teamSize: number, populationSize: number): TeamMember[][] {
    const population: TeamMember[][] = [];

    for (let i = 0; i < populationSize; i++) {
      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      population.push(shuffled.slice(0, teamSize));
    }

    return population;
  }

  private crossover(parent1: TeamMember[], parent2: TeamMember[], candidates: TeamMember[], teamSize: number): TeamMember[] {
    const offspring: TeamMember[] = [];
    const usedIds = new Set<string>();

    // Take random members from both parents
    const allParents = [...parent1, ...parent2];
    const shuffled = allParents.sort(() => Math.random() - 0.5);

    for (const member of shuffled) {
      if (offspring.length >= teamSize) break;
      if (!usedIds.has(member.userId)) {
        offspring.push(member);
        usedIds.add(member.userId);
      }
    }

    // Fill remaining spots with random candidates
    while (offspring.length < teamSize) {
      const availableCandidates = candidates.filter(c => !usedIds.has(c.userId));
      if (availableCandidates.length === 0) break;
      
      const randomCandidate = availableCandidates[Math.floor(Math.random() * availableCandidates.length)];
      offspring.push(randomCandidate);
      usedIds.add(randomCandidate.userId);
    }

    return offspring;
  }

  private mutate(team: TeamMember[], candidates: TeamMember[]): void {
    if (team.length === 0) return;

    const mutationIndex = Math.floor(Math.random() * team.length);
    const usedIds = new Set(team.map(m => m.userId));
    const availableCandidates = candidates.filter(c => !usedIds.has(c.userId));

    if (availableCandidates.length > 0) {
      const newMember = availableCandidates[Math.floor(Math.random() * availableCandidates.length)];
      team[mutationIndex] = newMember;
    }
  }

  private evaluateTeamComposition(team: TeamMember[], request: TeamFormationRequest): OptimalTeamComposition {
    const skillCoverage = this.calculateSkillCoverage(team, request.requiredSkills, request.preferredSkills);
    const diversityScore = this.calculateDiversityScore(team);
    const compatibilityScore = this.calculateCompatibilityScore(team);

    const totalScore = (
      skillCoverage * this.SKILL_COVERAGE_WEIGHT +
      diversityScore * this.DIVERSITY_WEIGHT +
      compatibilityScore * this.COMPATIBILITY_WEIGHT
    );

    return {
      members: team,
      skillCoverage,
      diversityScore,
      compatibilityScore,
      totalScore
    };
  }

  private calculateSkillCoverage(team: TeamMember[], requiredSkills: string[], preferredSkills: string[]): number {
    const teamSkills = new Set<string>();
    team.forEach(member => {
      member.skills.forEach(skill => teamSkills.add(skill.toLowerCase()));
    });

    let score = 0;
    let maxScore = 0;

    // Required skills (higher weight)
    requiredSkills.forEach(skill => {
      if (teamSkills.has(skill.toLowerCase())) {
        score += 10;
      }
      maxScore += 10;
    });

    // Preferred skills (lower weight)
    preferredSkills.forEach(skill => {
      if (teamSkills.has(skill.toLowerCase())) {
        score += 5;
      }
      maxScore += 5;
    });

    // Bonus for skill diversity
    const skillDiversityBonus = Math.min(teamSkills.size * 0.5, 10);
    score += skillDiversityBonus;
    maxScore += 10;

    return maxScore > 0 ? score / maxScore : 0;
  }

  private calculateDiversityScore(team: TeamMember[]): number {
    if (team.length <= 1) return 0;

    let diversityScore = 0;

    // Skill diversity
    const allSkills = team.flatMap(member => member.skills);
    const uniqueSkills = new Set(allSkills);
    const skillDiversity = uniqueSkills.size / Math.max(allSkills.length, 1);
    diversityScore += skillDiversity * 0.4;

    // Interest diversity
    const allInterests = team.flatMap(member => member.interests);
    const uniqueInterests = new Set(allInterests);
    const interestDiversity = uniqueInterests.size / Math.max(allInterests.length, 1);
    diversityScore += interestDiversity * 0.3;

    // Name diversity (simple heuristic for background diversity)
    const uniqueFirstNames = new Set(team.map(m => m.firstName));
    const nameDiversity = uniqueFirstNames.size / team.length;
    diversityScore += nameDiversity * 0.3;

    return Math.min(diversityScore, 1);
  }

  private calculateCompatibilityScore(team: TeamMember[]): number {
    if (team.length <= 1) return 1;

    let totalCompatibility = 0;
    let pairCount = 0;

    // Calculate pairwise compatibility
    for (let i = 0; i < team.length; i++) {
      for (let j = i + 1; j < team.length; j++) {
        const member1 = team[i];
        const member2 = team[j];
        
        // Interest overlap (some common ground is good)
        const commonInterests = member1.interests.filter(interest => 
          member2.interests.includes(interest)
        );
        const interestCompatibility = Math.min(commonInterests.length * 0.2, 1);

        // Skill complementarity (different skills are better)
        const commonSkills = member1.skills.filter(skill => 
          member2.skills.includes(skill)
        );
        const skillComplementarity = Math.max(0, 1 - (commonSkills.length * 0.1));

        const pairCompatibility = (interestCompatibility + skillComplementarity) / 2;
        totalCompatibility += pairCompatibility;
        pairCount++;
      }
    }

    return pairCount > 0 ? totalCompatibility / pairCount : 1;
  }

  private async createTeam(request: TeamFormationRequest, composition: OptimalTeamComposition): Promise<string | null> {
    try {
      const teamId = uuidv4();
      const teamName = request.teamName || `Team ${composition.members[0].firstName}`;
      const now = new Date();

      await pgPool.query(
        `INSERT INTO teams (team_id, team_name, hackathon_id, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [teamId, teamName, request.hackathonId, request.requesterId, now, now]
      );

      this.logInfo(`Created team ${teamId} with name "${teamName}"`);
      return teamId;

    } catch (error) {
      this.logError('Failed to create team', error);
      return null;
    }
  }

  private async addMembersToTeam(teamId: string, members: TeamMember[]): Promise<void> {
    try {
      for (const member of members) {
        const memberId = uuidv4();
        const now = new Date();

        await pgPool.query(
          `INSERT INTO team_members (team_member_id, team_id, user_id, role, joined_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [memberId, teamId, member.userId, member.role, now]
        );

        // Publish member added event
        this.publishEvent(EventTypes.TEAM_MEMBER_ADDED, {
          teamId,
          userId: member.userId,
          role: member.role,
          timestamp: now
        });

        this.logInfo(`Added ${member.role} ${member.userId} to team ${teamId}`);
      }
    } catch (error) {
      this.logError('Failed to add members to team', error);
    }
  }

  private async sendTeamInvitations(teamId: string, members: TeamMember[], request: TeamFormationRequest): Promise<void> {
    try {
      for (const member of members) {
        if (member.role !== 'leader') { // Don't send invitation to the team creator
          this.publishEvent(EventTypes.NOTIFICATION_SEND, {
            userId: member.userId,
            notification: {
              type: 'team_invitation',
              title: 'Team Invitation',
              message: `You've been invited to join a team for the hackathon!`,
              data: {
                teamId,
                hackathonId: request.hackathonId,
                invitedBy: request.requesterId,
                teamName: request.teamName,
                projectDescription: request.projectDescription
              }
            },
            timestamp: new Date()
          });
        }
      }

      this.logInfo(`Sent team invitations to ${members.length - 1} users for team ${teamId}`);
    } catch (error) {
      this.logError('Failed to send team invitations', error);
    }
  }

  private async suggestManualTeamFormation(request: TeamFormationRequest, candidates: TeamMember[]): Promise<void> {
    // Send notification with manual suggestions
    this.publishEvent(EventTypes.NOTIFICATION_SEND, {
      userId: request.requesterId,
      notification: {
        type: 'manual_team_formation_suggestion',
        title: 'Team Formation Suggestions',
        message: 'Automatic team formation found limited matches. Here are some manual suggestions.',
        data: {
          candidates: candidates.slice(0, 10), // Top 10 candidates
          hackathonId: request.hackathonId,
          requiredSkills: request.requiredSkills,
          preferredSkills: request.preferredSkills
        }
      },
      timestamp: new Date()
    });
  }

  private async checkExistingTeamMembership(userId: string, hackathonId: string): Promise<{ teamId: string } | null> {
    try {
      const result = await pgPool.query(
        `SELECT t.team_id FROM teams t
         JOIN team_members tm ON t.team_id = tm.team_id
         WHERE tm.user_id = $1 AND t.hackathon_id = $2`,
        [userId, hackathonId]
      );

      return result.rows.length > 0 ? { teamId: result.rows[0].team_id } : null;
    } catch (error) {
      this.logError('Failed to check existing team membership', error);
      return null;
    }
  }

  private async getRequesterProfile(userId: string): Promise<TeamMember | null> {
    try {
      const result = await pgPool.query(
        `SELECT u.user_id, u.username, u.first_name, u.last_name,
                p.skills, p.interests
         FROM users u
         LEFT JOIN profiles p ON u.user_id = p.user_id
         WHERE u.user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        userId: user.user_id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        skills: user.skills || [],
        interests: user.interests || [],
        role: 'leader',
        contributionScore: 0
      };
    } catch (error) {
      this.logError('Failed to get requester profile', error);
      return null;
    }
  }

  private async evaluateTeamSuggestions(event: Event): Promise<void> {
    // This method can be used to automatically act on team suggestions
    // For now, we'll just log the suggestions
    const { userId, suggestions } = event.payload;
    this.logInfo(`Received team suggestions for user ${userId}: ${suggestions.userSuggestions?.length || 0} user suggestions, ${suggestions.teamSuggestions?.length || 0} team suggestions`);
  }

  protected onStart(): void {
    this.logInfo('Team Forming Agent started - Ready to create optimal teams');
  }

  protected onStop(): void {
    this.logInfo('Team Forming Agent stopped');
  }
}

export default TeamFormingAgent;

