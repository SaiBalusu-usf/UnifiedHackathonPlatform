import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pgPool } from '../../config/database';
import { sendSuccess, sendError } from '../../shared/utils/response';
import { validateUUID } from '../../shared/utils/validation';
import { Team, TeamMember, TeamSuggestion } from '../../shared/types';
import { AuthenticatedRequest } from '../../shared/middleware/auth';

export class TeamController {
  async createTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { teamName, hackathonId } = req.body;
    const createdBy = req.user?.userId;

    try {
      if (!validateUUID(hackathonId)) {
        sendError(res, 'Invalid hackathon ID format', undefined, 400);
        return;
      }

      // Check if team name already exists for this hackathon
      const existingTeam = await pgPool.query(
        'SELECT team_id FROM teams WHERE team_name = $1 AND hackathon_id = $2',
        [teamName, hackathonId]
      );

      if (existingTeam.rows.length > 0) {
        sendError(res, 'Team name already exists for this hackathon', undefined, 409);
        return;
      }

      // Create team
      const team_id = uuidv4();
      const now = new Date();

      const teamResult = await pgPool.query(
        `INSERT INTO teams (team_id, team_name, hackathon_id, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [team_id, teamName, hackathonId, createdBy, now, now]
      );

      // Add creator as team leader
      const member_id = uuidv4();
      await pgPool.query(
        `INSERT INTO team_members (team_member_id, team_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [member_id, team_id, createdBy, 'leader', now]
      );

      const team = teamResult.rows[0];
      sendSuccess(res, 'Team created successfully', {
        teamId: team.team_id,
        teamName: team.team_name,
        hackathonId: team.hackathon_id,
        createdBy: team.created_by,
        createdAt: team.created_at
      }, 201);
    } catch (error) {
      console.error('Create team error:', error);
      sendError(res, 'Failed to create team', undefined, 500);
    }
  }

  async getTeamById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;

      if (!validateUUID(teamId)) {
        sendError(res, 'Invalid team ID format', undefined, 400);
        return;
      }

      const teamResult = await pgPool.query(
        `SELECT t.*, h.name as hackathon_name
         FROM teams t
         LEFT JOIN hackathons h ON t.hackathon_id = h.hackathon_id
         WHERE t.team_id = $1`,
        [teamId]
      );

      if (teamResult.rows.length === 0) {
        sendError(res, 'Team not found', undefined, 404);
        return;
      }

      // Get team members
      const membersResult = await pgPool.query(
        `SELECT tm.team_member_id, tm.user_id, tm.role, tm.joined_at,
                u.username, u.first_name, u.last_name, u.email,
                p.skills, p.interests
         FROM team_members tm
         JOIN users u ON tm.user_id = u.user_id
         LEFT JOIN profiles p ON u.user_id = p.user_id
         WHERE tm.team_id = $1
         ORDER BY tm.joined_at`,
        [teamId]
      );

      const team = teamResult.rows[0];
      const members = membersResult.rows.map(member => ({
        teamMemberId: member.team_member_id,
        userId: member.user_id,
        role: member.role,
        joinedAt: member.joined_at,
        username: member.username,
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        skills: member.skills || [],
        interests: member.interests || []
      }));

      sendSuccess(res, 'Team retrieved successfully', {
        teamId: team.team_id,
        teamName: team.team_name,
        hackathonId: team.hackathon_id,
        hackathonName: team.hackathon_name,
        createdBy: team.created_by,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
        members
      });
    } catch (error) {
      console.error('Get team error:', error);
      sendError(res, 'Failed to retrieve team', undefined, 500);
    }
  }

  async updateTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      const { teamName } = req.body;
      const userId = req.user?.userId;

      if (!validateUUID(teamId)) {
        sendError(res, 'Invalid team ID format', undefined, 400);
        return;
      }

      // Check if user is team leader or admin
      const teamResult = await pgPool.query(
        `SELECT t.created_by, tm.role
         FROM teams t
         LEFT JOIN team_members tm ON t.team_id = tm.team_id AND tm.user_id = $2
         WHERE t.team_id = $1`,
        [teamId, userId]
      );

      if (teamResult.rows.length === 0) {
        sendError(res, 'Team not found', undefined, 404);
        return;
      }

      const team = teamResult.rows[0];
      if (team.created_by !== userId && team.role !== 'leader' && req.user?.role !== 'admin') {
        sendError(res, 'Insufficient permissions to update team', undefined, 403);
        return;
      }

      // Update team
      const now = new Date();
      await pgPool.query(
        'UPDATE teams SET team_name = $1, updated_at = $2 WHERE team_id = $3',
        [teamName, now, teamId]
      );

      sendSuccess(res, 'Team updated successfully');
    } catch (error) {
      console.error('Update team error:', error);
      sendError(res, 'Failed to update team', undefined, 500);
    }
  }

  async deleteTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      const userId = req.user?.userId;

      if (!validateUUID(teamId)) {
        sendError(res, 'Invalid team ID format', undefined, 400);
        return;
      }

      // Check if user is team creator or admin
      const teamResult = await pgPool.query(
        'SELECT created_by FROM teams WHERE team_id = $1',
        [teamId]
      );

      if (teamResult.rows.length === 0) {
        sendError(res, 'Team not found', undefined, 404);
        return;
      }

      const team = teamResult.rows[0];
      if (team.created_by !== userId && req.user?.role !== 'admin') {
        sendError(res, 'Insufficient permissions to delete team', undefined, 403);
        return;
      }

      // Delete team members first (foreign key constraint)
      await pgPool.query('DELETE FROM team_members WHERE team_id = $1', [teamId]);
      
      // Delete team
      await pgPool.query('DELETE FROM teams WHERE team_id = $1', [teamId]);

      sendSuccess(res, 'Team deleted successfully');
    } catch (error) {
      console.error('Delete team error:', error);
      sendError(res, 'Failed to delete team', undefined, 500);
    }
  }

  async addMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      const { userId, role = 'member' } = req.body;
      const requesterId = req.user?.userId;

      if (!validateUUID(teamId) || !validateUUID(userId)) {
        sendError(res, 'Invalid ID format', undefined, 400);
        return;
      }

      // Check if requester has permission to add members
      const teamResult = await pgPool.query(
        `SELECT t.created_by, tm.role
         FROM teams t
         LEFT JOIN team_members tm ON t.team_id = tm.team_id AND tm.user_id = $2
         WHERE t.team_id = $1`,
        [teamId, requesterId]
      );

      if (teamResult.rows.length === 0) {
        sendError(res, 'Team not found', undefined, 404);
        return;
      }

      const team = teamResult.rows[0];
      if (team.created_by !== requesterId && team.role !== 'leader' && req.user?.role !== 'admin') {
        sendError(res, 'Insufficient permissions to add members', undefined, 403);
        return;
      }

      // Check if user is already a member
      const existingMember = await pgPool.query(
        'SELECT team_member_id FROM team_members WHERE team_id = $1 AND user_id = $2',
        [teamId, userId]
      );

      if (existingMember.rows.length > 0) {
        sendError(res, 'User is already a member of this team', undefined, 409);
        return;
      }

      // Add member
      const member_id = uuidv4();
      const now = new Date();

      await pgPool.query(
        `INSERT INTO team_members (team_member_id, team_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [member_id, teamId, userId, role, now]
      );

      sendSuccess(res, 'Member added successfully', {
        teamMemberId: member_id,
        teamId,
        userId,
        role,
        joinedAt: now
      });
    } catch (error) {
      console.error('Add member error:', error);
      sendError(res, 'Failed to add member', undefined, 500);
    }
  }

  async removeMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { teamId, userId } = req.params;
      const requesterId = req.user?.userId;

      if (!validateUUID(teamId) || !validateUUID(userId)) {
        sendError(res, 'Invalid ID format', undefined, 400);
        return;
      }

      // Check permissions (team leader, admin, or the user themselves)
      const teamResult = await pgPool.query(
        `SELECT t.created_by, tm.role
         FROM teams t
         LEFT JOIN team_members tm ON t.team_id = tm.team_id AND tm.user_id = $2
         WHERE t.team_id = $1`,
        [teamId, requesterId]
      );

      if (teamResult.rows.length === 0) {
        sendError(res, 'Team not found', undefined, 404);
        return;
      }

      const team = teamResult.rows[0];
      const canRemove = team.created_by === requesterId || 
                       team.role === 'leader' || 
                       req.user?.role === 'admin' || 
                       userId === requesterId;

      if (!canRemove) {
        sendError(res, 'Insufficient permissions to remove member', undefined, 403);
        return;
      }

      // Remove member
      const result = await pgPool.query(
        'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
        [teamId, userId]
      );

      if (result.rowCount === 0) {
        sendError(res, 'Member not found in team', undefined, 404);
        return;
      }

      sendSuccess(res, 'Member removed successfully');
    } catch (error) {
      console.error('Remove member error:', error);
      sendError(res, 'Failed to remove member', undefined, 500);
    }
  }

  async getTeamMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;

      if (!validateUUID(teamId)) {
        sendError(res, 'Invalid team ID format', undefined, 400);
        return;
      }

      const result = await pgPool.query(
        `SELECT tm.team_member_id, tm.user_id, tm.role, tm.joined_at,
                u.username, u.first_name, u.last_name, u.email,
                p.skills, p.interests
         FROM team_members tm
         JOIN users u ON tm.user_id = u.user_id
         LEFT JOIN profiles p ON u.user_id = p.user_id
         WHERE tm.team_id = $1
         ORDER BY tm.joined_at`,
        [teamId]
      );

      const members = result.rows.map(member => ({
        teamMemberId: member.team_member_id,
        userId: member.user_id,
        role: member.role,
        joinedAt: member.joined_at,
        username: member.username,
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        skills: member.skills || [],
        interests: member.interests || []
      }));

      sendSuccess(res, 'Team members retrieved successfully', members);
    } catch (error) {
      console.error('Get team members error:', error);
      sendError(res, 'Failed to retrieve team members', undefined, 500);
    }
  }

  async getUserSuggestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { hackathonId, skills, limit = '10' } = req.query;

      // Get user's profile
      const userProfile = await pgPool.query(
        'SELECT skills, interests FROM profiles WHERE user_id = $1',
        [userId]
      );

      if (userProfile.rows.length === 0) {
        sendError(res, 'User profile not found', undefined, 404);
        return;
      }

      const userSkills = userProfile.rows[0].skills || [];
      const userInterests = userProfile.rows[0].interests || [];

      // Find users with complementary skills
      let query = `
        SELECT DISTINCT u.user_id, u.username, u.first_name, u.last_name,
               p.skills, p.interests,
               CASE 
                 WHEN p.skills && $1::text[] THEN 2
                 WHEN p.interests && $2::text[] THEN 1
                 ELSE 0
               END as match_score
        FROM users u
        JOIN profiles p ON u.user_id = p.user_id
        WHERE u.user_id != $3
      `;

      const queryParams: any[] = [userSkills, userInterests, userId];
      let paramIndex = 4;

      if (hackathonId) {
        query += ` AND u.user_id NOT IN (
          SELECT tm.user_id FROM team_members tm
          JOIN teams t ON tm.team_id = t.team_id
          WHERE t.hackathon_id = $${paramIndex}
        )`;
        queryParams.push(hackathonId);
        paramIndex++;
      }

      query += ` ORDER BY match_score DESC, RANDOM() LIMIT $${paramIndex}`;
      queryParams.push(parseInt(limit as string));

      const result = await pgPool.query(query, queryParams);

      const suggestions: TeamSuggestion[] = result.rows.map(user => ({
        matchingScore: user.match_score,
        suggestedUsers: [{
          user_id: user.user_id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          skills: user.skills || [],
          interests: user.interests || []
        }]
      }));

      sendSuccess(res, 'User suggestions retrieved successfully', suggestions);
    } catch (error) {
      console.error('Get user suggestions error:', error);
      sendError(res, 'Failed to retrieve user suggestions', undefined, 500);
    }
  }

  async getTeamSuggestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { hackathonId, limit = '10' } = req.query;

      let query = `
        SELECT t.team_id, t.team_name, t.hackathon_id,
               COUNT(tm.user_id) as members_count,
               ARRAY_AGG(DISTINCT unnest(p.skills)) as team_skills
        FROM teams t
        LEFT JOIN team_members tm ON t.team_id = tm.team_id
        LEFT JOIN profiles p ON tm.user_id = p.user_id
        WHERE t.team_id NOT IN (
          SELECT team_id FROM team_members WHERE user_id = $1
        )
      `;

      const queryParams: any[] = [userId];
      let paramIndex = 2;

      if (hackathonId) {
        query += ` AND t.hackathon_id = $${paramIndex}`;
        queryParams.push(hackathonId);
        paramIndex++;
      }

      query += ` GROUP BY t.team_id, t.team_name, t.hackathon_id
                 HAVING COUNT(tm.user_id) < 6
                 ORDER BY members_count ASC, RANDOM()
                 LIMIT $${paramIndex}`;
      queryParams.push(parseInt(limit as string));

      const result = await pgPool.query(query, queryParams);

      const suggestions: TeamSuggestion[] = result.rows.map(team => ({
        teamId: team.team_id,
        teamName: team.team_name,
        membersCount: parseInt(team.members_count),
        matchingScore: Math.random() * 5 // Simple random scoring for now
      }));

      sendSuccess(res, 'Team suggestions retrieved successfully', suggestions);
    } catch (error) {
      console.error('Get team suggestions error:', error);
      sendError(res, 'Failed to retrieve team suggestions', undefined, 500);
    }
  }

  async getTeamsByHackathon(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      if (!validateUUID(hackathonId)) {
        sendError(res, 'Invalid hackathon ID format', undefined, 400);
        return;
      }

      const countResult = await pgPool.query(
        'SELECT COUNT(*) FROM teams WHERE hackathon_id = $1',
        [hackathonId]
      );
      const total = parseInt(countResult.rows[0].count);

      const result = await pgPool.query(
        `SELECT t.team_id, t.team_name, t.created_by, t.created_at,
                COUNT(tm.user_id) as members_count
         FROM teams t
         LEFT JOIN team_members tm ON t.team_id = tm.team_id
         WHERE t.hackathon_id = $1
         GROUP BY t.team_id, t.team_name, t.created_by, t.created_at
         ORDER BY t.created_at DESC
         LIMIT $2 OFFSET $3`,
        [hackathonId, limit, offset]
      );

      const teams = result.rows.map(team => ({
        teamId: team.team_id,
        teamName: team.team_name,
        createdBy: team.created_by,
        createdAt: team.created_at,
        membersCount: parseInt(team.members_count)
      }));

      const totalPages = Math.ceil(total / limit);

      sendSuccess(res, 'Teams retrieved successfully', {
        teams,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });
    } catch (error) {
      console.error('Get teams by hackathon error:', error);
      sendError(res, 'Failed to retrieve teams', undefined, 500);
    }
  }

  async getUserTeams(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requesterId = req.user?.userId;

      if (!validateUUID(userId)) {
        sendError(res, 'Invalid user ID format', undefined, 400);
        return;
      }

      // Users can only see their own teams unless they're admin
      if (userId !== requesterId && req.user?.role !== 'admin') {
        sendError(res, 'Insufficient permissions', undefined, 403);
        return;
      }

      const result = await pgPool.query(
        `SELECT t.team_id, t.team_name, t.hackathon_id, t.created_at,
                tm.role, tm.joined_at,
                h.name as hackathon_name,
                COUNT(tm2.user_id) as members_count
         FROM team_members tm
         JOIN teams t ON tm.team_id = t.team_id
         LEFT JOIN hackathons h ON t.hackathon_id = h.hackathon_id
         LEFT JOIN team_members tm2 ON t.team_id = tm2.team_id
         WHERE tm.user_id = $1
         GROUP BY t.team_id, t.team_name, t.hackathon_id, t.created_at, tm.role, tm.joined_at, h.name
         ORDER BY tm.joined_at DESC`,
        [userId]
      );

      const teams = result.rows.map(team => ({
        teamId: team.team_id,
        teamName: team.team_name,
        hackathonId: team.hackathon_id,
        hackathonName: team.hackathon_name,
        role: team.role,
        joinedAt: team.joined_at,
        createdAt: team.created_at,
        membersCount: parseInt(team.members_count)
      }));

      sendSuccess(res, 'User teams retrieved successfully', teams);
    } catch (error) {
      console.error('Get user teams error:', error);
      sendError(res, 'Failed to retrieve user teams', undefined, 500);
    }
  }
}

