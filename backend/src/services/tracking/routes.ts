import { Router } from 'express';
import { TrackingController } from './controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth';
import { validateRequired } from '../../shared/utils/validation';

const router = Router();
const trackingController = new TrackingController();

// Check-in routes
router.post('/check-in',
  authenticateToken,
  validateRequired(['hackathonId', 'sessionId', 'location']),
  trackingController.checkIn
);

// Get tracking data for a hackathon
router.get('/:hackathonId',
  authenticateToken,
  trackingController.getTrackingData
);

// Get user's tracking history
router.get('/user/:userId',
  authenticateToken,
  trackingController.getUserTrackingHistory
);

// Get real-time tracking data (WebSocket endpoint would be better)
router.get('/:hackathonId/realtime',
  authenticateToken,
  trackingController.getRealTimeData
);

// Session management routes
router.post('/sessions',
  authenticateToken,
  authorizeRoles('admin', 'organizer'),
  validateRequired(['hackathonId', 'name', 'startTime', 'endTime']),
  trackingController.createSession
);

router.get('/sessions/:hackathonId',
  authenticateToken,
  trackingController.getSessionsByHackathon
);

router.put('/sessions/:sessionId',
  authenticateToken,
  authorizeRoles('admin', 'organizer'),
  trackingController.updateSession
);

router.delete('/sessions/:sessionId',
  authenticateToken,
  authorizeRoles('admin', 'organizer'),
  trackingController.deleteSession
);

// Analytics routes
router.get('/analytics/:hackathonId/attendance',
  authenticateToken,
  authorizeRoles('admin', 'organizer'),
  trackingController.getAttendanceAnalytics
);

router.get('/analytics/:hackathonId/heatmap',
  authenticateToken,
  authorizeRoles('admin', 'organizer'),
  trackingController.getLocationHeatmap
);

router.get('/analytics/:hackathonId/timeline',
  authenticateToken,
  authorizeRoles('admin', 'organizer'),
  trackingController.getTimelineAnalytics
);

export default router;

