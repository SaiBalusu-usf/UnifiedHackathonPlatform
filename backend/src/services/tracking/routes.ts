import { Router } from 'express';
import { requireHackathonRole } from '../../shared/middleware/rbac';
import { SessionModel } from './models';
import { TrackingController } from './controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth';
import { validateRequired } from '../../shared/utils/validation';

const router = Router();
const trackingController = new TrackingController();

// Check-in routes
router.post('/check-in',
  authenticateToken,
  validateRequired(['hackathonId', 'sessionId', 'location']),
  requireHackathonRole(['participant', 'organizer']),
  trackingController.checkIn
);

// Get tracking data for a hackathon
router.get('/:hackathonId',
  authenticateToken,
  requireHackathonRole('organizer'),
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
  requireHackathonRole('organizer'),
  trackingController.getRealTimeData
);

// Session management routes
router.post('/sessions',
  authenticateToken,
  authorizeRoles('admin', 'organizer'),
  validateRequired(['hackathonId', 'name', 'startTime', 'endTime']),
  requireHackathonRole('organizer'),
  trackingController.createSession
);

router.get('/sessions/:hackathonId',
  authenticateToken,
  trackingController.getSessionsByHackathon
);

router.put('/sessions/:sessionId',
  authenticateToken,
  authorizeRoles('admin', 'organizer'),
  async (req, res, next) => {
    try {
      const session = await SessionModel.findOne({ session_id: req.params.sessionId }).lean();
      if (!session) { res.sendStatus(404); return; }
      req.params.hackathonId = session.hackathon_id;
      return requireHackathonRole('organizer')(req, res, next);
    } catch (error) { next(error); }
  },
  trackingController.updateSession
);

router.delete('/sessions/:sessionId',
  authenticateToken,
  authorizeRoles('admin', 'organizer'),
  async (req, res, next) => {
    try {
      const session = await SessionModel.findOne({ session_id: req.params.sessionId }).lean();
      if (!session) { res.sendStatus(404); return; }
      req.params.hackathonId = session.hackathon_id;
      return requireHackathonRole('organizer')(req, res, next);
    } catch (error) { next(error); }
  },
  trackingController.deleteSession
);

// Analytics routes
router.get('/analytics/:hackathonId/attendance',
  authenticateToken,
  authorizeRoles('admin', 'organizer'),
  requireHackathonRole('organizer'),
  trackingController.getAttendanceAnalytics
);

router.get('/analytics/:hackathonId/heatmap',
  authenticateToken,
  authorizeRoles('admin', 'organizer'),
  requireHackathonRole('organizer'),
  trackingController.getLocationHeatmap
);

router.get('/analytics/:hackathonId/timeline',
  authenticateToken,
  authorizeRoles('admin', 'organizer'),
  requireHackathonRole('organizer'),
  trackingController.getTimelineAnalytics
);

export default router;

