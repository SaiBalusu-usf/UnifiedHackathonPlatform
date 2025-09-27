import { Router } from 'express';
import { TeamController } from './controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth';
import { validateRequired } from '../../shared/utils/validation';

const router = Router();
const teamController = new TeamController();

// Team management routes
router.post('/',
  authenticateToken,
  validateRequired(['teamName', 'hackathonId']),
  teamController.createTeam
);

router.get('/:teamId',
  authenticateToken,
  teamController.getTeamById
);

router.put('/:teamId',
  authenticateToken,
  teamController.updateTeam
);

router.delete('/:teamId',
  authenticateToken,
  teamController.deleteTeam
);

// Team member management
router.post('/:teamId/members',
  authenticateToken,
  validateRequired(['userId']),
  teamController.addMember
);

router.delete('/:teamId/members/:userId',
  authenticateToken,
  teamController.removeMember
);

router.get('/:teamId/members',
  authenticateToken,
  teamController.getTeamMembers
);

// Team suggestions and matching
router.get('/suggestions/users',
  authenticateToken,
  teamController.getUserSuggestions
);

router.get('/suggestions/teams',
  authenticateToken,
  teamController.getTeamSuggestions
);

// Hackathon-specific teams
router.get('/hackathon/:hackathonId',
  authenticateToken,
  teamController.getTeamsByHackathon
);

// User's teams
router.get('/user/:userId',
  authenticateToken,
  teamController.getUserTeams
);

export default router;

