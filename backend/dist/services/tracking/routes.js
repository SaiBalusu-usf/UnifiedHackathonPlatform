"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../shared/middleware/auth");
const validation_1 = require("../../shared/utils/validation");
const router = (0, express_1.Router)();
const trackingController = new controller_1.TrackingController();
// Check-in routes
router.post('/check-in', auth_1.authenticateToken, (0, validation_1.validateRequired)(['hackathonId', 'sessionId', 'location']), trackingController.checkIn);
// Get tracking data for a hackathon
router.get('/:hackathonId', auth_1.authenticateToken, trackingController.getTrackingData);
// Get user's tracking history
router.get('/user/:userId', auth_1.authenticateToken, trackingController.getUserTrackingHistory);
// Get real-time tracking data (WebSocket endpoint would be better)
router.get('/:hackathonId/realtime', auth_1.authenticateToken, trackingController.getRealTimeData);
// Session management routes
router.post('/sessions', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('admin', 'organizer'), (0, validation_1.validateRequired)(['hackathonId', 'name', 'startTime', 'endTime']), trackingController.createSession);
router.get('/sessions/:hackathonId', auth_1.authenticateToken, trackingController.getSessionsByHackathon);
router.put('/sessions/:sessionId', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('admin', 'organizer'), trackingController.updateSession);
router.delete('/sessions/:sessionId', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('admin', 'organizer'), trackingController.deleteSession);
// Analytics routes
router.get('/analytics/:hackathonId/attendance', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('admin', 'organizer'), trackingController.getAttendanceAnalytics);
router.get('/analytics/:hackathonId/heatmap', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('admin', 'organizer'), trackingController.getLocationHeatmap);
router.get('/analytics/:hackathonId/timeline', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('admin', 'organizer'), trackingController.getTimelineAnalytics);
exports.default = router;
//# sourceMappingURL=routes.js.map