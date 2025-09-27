"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const socket_io_client_1 = require("socket.io-client");
const server_1 = __importDefault(require("../../services/auth/server"));
const server_2 = __importDefault(require("../../services/user-management/server"));
const server_3 = __importDefault(require("../../services/team-formation/server"));
const AgentManager_1 = require("../../agents/AgentManager");
const ProfileParsingAgent_1 = require("../../agents/ProfileParsingAgent");
const SkillMatchingAgent_1 = require("../../agents/SkillMatchingAgent");
const TeamFormingAgent_1 = require("../../agents/TeamFormingAgent");
describe('Platform End-to-End Tests', () => {
    let authServer;
    let userServer;
    let teamServer;
    let agentManager;
    let clientSocket;
    let authToken;
    let userId;
    const testUser = {
        email: 'e2e@example.com',
        password: 'TestPassword123!',
        firstName: 'E2E',
        lastName: 'Test',
        username: 'e2etest'
    };
    beforeAll(async () => {
        // Start all services
        authServer = server_1.default.listen(3001);
        userServer = server_2.default.listen(3002);
        teamServer = server_3.default.listen(3003);
        // Initialize agent manager
        agentManager = new AgentManager_1.AgentManager();
        agentManager.registerAgent(new ProfileParsingAgent_1.ProfileParsingAgent('profile-agent-e2e'));
        agentManager.registerAgent(new SkillMatchingAgent_1.SkillMatchingAgent('skill-agent-e2e'));
        agentManager.registerAgent(new TeamFormingAgent_1.TeamFormingAgent('team-agent-e2e'));
        await agentManager.startAgent('profile-agent-e2e');
        await agentManager.startAgent('skill-agent-e2e');
        await agentManager.startAgent('team-agent-e2e');
        // Wait for services to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
    });
    afterAll(async () => {
        if (clientSocket) {
            clientSocket.disconnect();
        }
        agentManager.shutdown();
        authServer.close();
        userServer.close();
        teamServer.close();
    });
    describe('Complete User Journey', () => {
        it('should complete full user registration and authentication flow', async () => {
            // 1. Register new user
            const registerResponse = await (0, supertest_1.default)(server_1.default)
                .post('/api/auth/register')
                .send(testUser)
                .expect(201);
            expect(registerResponse.body.success).toBe(true);
            authToken = registerResponse.body.data.tokens.accessToken;
            userId = registerResponse.body.data.user.id;
            // 2. Verify profile was created
            const profileResponse = await (0, supertest_1.default)(server_1.default)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(profileResponse.body.data.user.email).toBe(testUser.email);
            // 3. Login with credentials
            const loginResponse = await (0, supertest_1.default)(server_1.default)
                .post('/api/auth/login')
                .send({
                email: testUser.email,
                password: testUser.password
            })
                .expect(200);
            expect(loginResponse.body.success).toBe(true);
            authToken = loginResponse.body.data.tokens.accessToken;
        });
        it('should handle resume upload and AI processing', async () => {
            const resumeText = `
        John Doe
        Senior Full Stack Developer
        
        Experience:
        - 5+ years in JavaScript, React, Node.js
        - 3 years with Python and Django
        - AWS cloud architecture experience
        - Team leadership and mentoring
        
        Education:
        - MS Computer Science, Stanford University
        - BS Software Engineering, UC Berkeley
        
        Skills: JavaScript, TypeScript, React, Node.js, Python, Django, 
        AWS, Docker, Kubernetes, PostgreSQL, MongoDB, Redis
      `;
            // Upload resume (simulated)
            const uploadResponse = await (0, supertest_1.default)(server_2.default)
                .post('/api/users/resume')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                text: resumeText,
                filename: 'resume.txt',
                mimeType: 'text/plain'
            })
                .expect(200);
            expect(uploadResponse.body.success).toBe(true);
            const resumeId = uploadResponse.body.data.resumeId;
            // Wait for AI processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Check if resume was parsed
            const resumeResponse = await (0, supertest_1.default)(server_2.default)
                .get(`/api/users/resume/${resumeId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(resumeResponse.body.data.parsed).toBe(true);
            expect(resumeResponse.body.data.skills).toContain('JavaScript');
            expect(resumeResponse.body.data.skills).toContain('React');
            expect(resumeResponse.body.data.skills).toContain('Python');
        });
        it('should find skill matches and team suggestions', async () => {
            // Create additional test users for matching
            const testUsers = [
                {
                    email: 'dev1@example.com',
                    skills: ['JavaScript', 'Vue.js', 'Node.js'],
                    experience: 3
                },
                {
                    email: 'dev2@example.com',
                    skills: ['Python', 'Django', 'PostgreSQL'],
                    experience: 2
                },
                {
                    email: 'designer@example.com',
                    skills: ['UI/UX Design', 'Figma', 'Adobe Creative Suite'],
                    experience: 4
                }
            ];
            // Register additional users (simplified)
            for (const user of testUsers) {
                await (0, supertest_1.default)(server_1.default)
                    .post('/api/auth/register')
                    .send({
                    ...user,
                    password: 'TestPassword123!',
                    firstName: 'Test',
                    lastName: 'User',
                    username: user.email.split('@')[0]
                });
            }
            // Find matches for our main user
            const matchResponse = await (0, supertest_1.default)(server_2.default)
                .get('/api/users/matches')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ limit: 5 })
                .expect(200);
            expect(matchResponse.body.success).toBe(true);
            expect(matchResponse.body.data.matches).toHaveLength(3);
            expect(matchResponse.body.data.matches[0]).toMatchObject({
                user: expect.objectContaining({
                    email: expect.any(String)
                }),
                compatibility: expect.objectContaining({
                    score: expect.any(Number),
                    sharedSkills: expect.any(Array)
                })
            });
        });
        it('should create and manage teams', async () => {
            // Create a hackathon first
            const hackathonResponse = await (0, supertest_1.default)(server_3.default)
                .post('/api/hackathons')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: 'E2E Test Hackathon',
                description: 'Test hackathon for end-to-end testing',
                startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                endDate: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
                location: 'Virtual',
                maxParticipants: 100
            })
                .expect(201);
            const hackathonId = hackathonResponse.body.data.hackathon.id;
            // Create a team
            const teamResponse = await (0, supertest_1.default)(server_3.default)
                .post('/api/teams')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: 'E2E Test Team',
                description: 'A team for end-to-end testing',
                hackathonId,
                maxMembers: 4,
                requiredSkills: ['JavaScript', 'Python', 'Design']
            })
                .expect(201);
            expect(teamResponse.body.success).toBe(true);
            const teamId = teamResponse.body.data.team.id;
            // Get team details
            const teamDetailsResponse = await (0, supertest_1.default)(server_3.default)
                .get(`/api/teams/${teamId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(teamDetailsResponse.body.data.team).toMatchObject({
                id: teamId,
                name: 'E2E Test Team',
                leaderId: userId,
                members: expect.arrayContaining([
                    expect.objectContaining({ userId })
                ])
            });
            // Invite a member (simulated)
            const inviteResponse = await (0, supertest_1.default)(server_3.default)
                .post(`/api/teams/${teamId}/invite`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                email: 'dev1@example.com'
            })
                .expect(200);
            expect(inviteResponse.body.success).toBe(true);
        });
        it('should handle real-time WebSocket communication', async () => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('WebSocket test timeout'));
                }, 10000);
                // Connect to WebSocket server
                clientSocket = (0, socket_io_client_1.io)('http://localhost:3000', {
                    auth: {
                        token: authToken
                    }
                });
                clientSocket.on('connect', () => {
                    console.log('WebSocket connected');
                    // Join hackathon room
                    clientSocket.emit('join-hackathon', 'test-hackathon-id');
                    // Listen for location updates
                    clientSocket.on('location-update', (data) => {
                        expect(data).toMatchObject({
                            userId: expect.any(String),
                            location: expect.objectContaining({
                                latitude: expect.any(Number),
                                longitude: expect.any(Number)
                            })
                        });
                        clearTimeout(timeout);
                        resolve();
                    });
                    // Send location update
                    setTimeout(() => {
                        clientSocket.emit('location-update', {
                            hackathonId: 'test-hackathon-id',
                            location: {
                                latitude: 37.7749,
                                longitude: -122.4194,
                                accuracy: 10,
                                timestamp: new Date().toISOString()
                            }
                        });
                    }, 500);
                });
                clientSocket.on('connect_error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
        });
        it('should track user activity and sessions', async () => {
            // Start a work session
            const sessionResponse = await (0, supertest_1.default)(server_2.default)
                .post('/api/users/sessions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                hackathonId: 'test-hackathon-id',
                teamId: 'test-team-id'
            })
                .expect(201);
            expect(sessionResponse.body.success).toBe(true);
            const sessionId = sessionResponse.body.data.session.id;
            // Update session with activity
            await (0, supertest_1.default)(server_2.default)
                .put(`/api/users/sessions/${sessionId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                status: 'active',
                currentTask: 'Working on frontend components'
            })
                .expect(200);
            // Get session details
            const sessionDetailsResponse = await (0, supertest_1.default)(server_2.default)
                .get(`/api/users/sessions/${sessionId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(sessionDetailsResponse.body.data.session).toMatchObject({
                id: sessionId,
                userId,
                status: 'active',
                currentTask: 'Working on frontend components'
            });
            // End session
            await (0, supertest_1.default)(server_2.default)
                .delete(`/api/users/sessions/${sessionId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
        });
        it('should generate comprehensive analytics', async () => {
            // Get user analytics
            const userAnalyticsResponse = await (0, supertest_1.default)(server_2.default)
                .get('/api/users/analytics')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(userAnalyticsResponse.body.data).toMatchObject({
                totalSessions: expect.any(Number),
                totalWorkTime: expect.any(Number),
                skillMatches: expect.any(Number),
                teamsJoined: expect.any(Number),
                hackathonsParticipated: expect.any(Number)
            });
            // Get system analytics (admin only)
            const systemAnalyticsResponse = await (0, supertest_1.default)(server_2.default)
                .get('/api/analytics/system')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200); // Should work if user has admin permissions
            expect(systemAnalyticsResponse.body.data).toMatchObject({
                totalUsers: expect.any(Number),
                activeUsers: expect.any(Number),
                totalTeams: expect.any(Number),
                totalHackathons: expect.any(Number),
                agentMetrics: expect.objectContaining({
                    totalTasksProcessed: expect.any(Number),
                    averageResponseTime: expect.any(Number)
                })
            });
        });
    });
    describe('Error Handling and Edge Cases', () => {
        it('should handle service unavailability gracefully', async () => {
            // Simulate service downtime by stopping a service
            teamServer.close();
            const response = await (0, supertest_1.default)(server_3.default)
                .get('/api/teams')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(503);
            expect(response.body).toMatchObject({
                success: false,
                error: 'Service Unavailable'
            });
            // Restart service
            teamServer = server_3.default.listen(3003);
            await new Promise(resolve => setTimeout(resolve, 1000));
        });
        it('should handle invalid data gracefully', async () => {
            // Try to create team with invalid data
            const response = await (0, supertest_1.default)(server_3.default)
                .post('/api/teams')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: '', // Invalid: empty name
                maxMembers: 15, // Invalid: too many members
                requiredSkills: Array(25).fill('skill') // Invalid: too many skills
            })
                .expect(400);
            expect(response.body).toMatchObject({
                error: 'Validation failed',
                details: expect.any(Array)
            });
        });
        it('should handle concurrent operations correctly', async () => {
            // Simulate multiple users trying to join the same team simultaneously
            const promises = Array.from({ length: 5 }, (_, i) => (0, supertest_1.default)(server_3.default)
                .post('/api/teams/test-team-id/join')
                .set('Authorization', `Bearer ${authToken}`)
                .send({}));
            const responses = await Promise.allSettled(promises);
            // Should handle race conditions gracefully
            const successfulResponses = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
            expect(successfulResponses.length).toBeLessThanOrEqual(1); // Only one should succeed
        });
        it('should maintain data consistency across services', async () => {
            // Create a team
            const teamResponse = await (0, supertest_1.default)(server_3.default)
                .post('/api/teams')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: 'Consistency Test Team',
                description: 'Testing data consistency',
                hackathonId: 'test-hackathon-id',
                maxMembers: 3,
                requiredSkills: ['JavaScript']
            })
                .expect(201);
            const teamId = teamResponse.body.data.team.id;
            // Verify team exists in user service
            const userTeamsResponse = await (0, supertest_1.default)(server_2.default)
                .get('/api/users/teams')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            const userTeams = userTeamsResponse.body.data.teams;
            expect(userTeams.some((team) => team.id === teamId)).toBe(true);
            // Delete team
            await (0, supertest_1.default)(server_3.default)
                .delete(`/api/teams/${teamId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            // Verify team is removed from user service
            const updatedUserTeamsResponse = await (0, supertest_1.default)(server_2.default)
                .get('/api/users/teams')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            const updatedUserTeams = updatedUserTeamsResponse.body.data.teams;
            expect(updatedUserTeams.some((team) => team.id === teamId)).toBe(false);
        });
    });
    describe('Performance and Load Testing', () => {
        it('should handle multiple concurrent users', async () => {
            const concurrentUsers = 10;
            const promises = Array.from({ length: concurrentUsers }, async (_, i) => {
                const userResponse = await (0, supertest_1.default)(server_1.default)
                    .post('/api/auth/register')
                    .send({
                    email: `load-test-${i}@example.com`,
                    password: 'TestPassword123!',
                    firstName: 'Load',
                    lastName: `Test${i}`,
                    username: `loadtest${i}`
                });
                if (userResponse.status === 201) {
                    const token = userResponse.body.data.tokens.accessToken;
                    // Perform various operations
                    await (0, supertest_1.default)(server_2.default)
                        .get('/api/users/profile')
                        .set('Authorization', `Bearer ${token}`);
                    await (0, supertest_1.default)(server_2.default)
                        .get('/api/users/matches')
                        .set('Authorization', `Bearer ${token}`);
                    return { success: true, userId: userResponse.body.data.user.id };
                }
                return { success: false };
            });
            const results = await Promise.allSettled(promises);
            const successfulResults = results.filter(r => r.status === 'fulfilled' && r.value.success);
            expect(successfulResults.length).toBeGreaterThan(concurrentUsers * 0.8); // At least 80% success rate
        }, 30000);
        it('should maintain response times under load', async () => {
            const startTime = Date.now();
            const promises = Array.from({ length: 20 }, () => (0, supertest_1.default)(server_1.default)
                .get('/health'));
            await Promise.all(promises);
            const endTime = Date.now();
            const averageResponseTime = (endTime - startTime) / 20;
            expect(averageResponseTime).toBeLessThan(1000); // Less than 1 second average
        });
    });
});
//# sourceMappingURL=platform.test.js.map