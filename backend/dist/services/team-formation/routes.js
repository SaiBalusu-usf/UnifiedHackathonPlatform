"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../shared/middleware/auth");
const validation_1 = require("../../shared/utils/validation");
const router = (0, express_1.Router)();
const teamController = new controller_1.TeamController();
// Team management routes
router.post('/', auth_1.authenticateToken, (0, validation_1.validateRequired)(['teamName', 'hackathonId']), teamController.createTeam);
router.get('/:teamId', auth_1.authenticateToken, teamController.getTeamById);
router.put('/:teamId', auth_1.authenticateToken, teamController.updateTeam);
router.delete('/:teamId', auth_1.authenticateToken, teamController.deleteTeam);
// Team member management
router.post('/:teamId/members', auth_1.authenticateToken, (0, validation_1.validateRequired)(['userId']), teamController.addMember);
router.delete('/:teamId/members/:userId', auth_1.authenticateToken, teamController.removeMember);
router.get('/:teamId/members', auth_1.authenticateToken, teamController.getTeamMembers);
// Team suggestions and matching
router.get('/suggestions/users', auth_1.authenticateToken, teamController.getUserSuggestions);
router.get('/suggestions/teams', auth_1.authenticateToken, teamController.getTeamSuggestions);
// Hackathon-specific teams
router.get('/hackathon/:hackathonId', auth_1.authenticateToken, teamController.getTeamsByHackathon);
// User's teams
router.get('/user/:userId', auth_1.authenticateToken, teamController.getUserTeams);
exports.default = router;
//# sourceMappingURL=routes.js.map