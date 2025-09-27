import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TrackingLogModel, SessionModel } from './models';
import { sendSuccess, sendError } from '../../shared/utils/response';
import { validateUUID } from '../../shared/utils/validation';
import { AuthenticatedRequest } from '../../shared/middleware/auth';

export class TrackingController {
  async checkIn(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { hackathonId, sessionId, location } = req.body;
      const userId = req.user?.userId;

      if (!validateUUID(hackathonId) || !validateUUID(sessionId)) {
        sendError(res, 'Invalid hackathon ID or session ID format', undefined, 400);
        return;
      }

      if (!location || !location.latitude || !location.longitude) {
        sendError(res, 'Valid location coordinates are required', undefined, 400);
        return;
      }

      // Validate coordinates
      const { latitude, longitude } = location;
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        sendError(res, 'Invalid coordinates', undefined, 400);
        return;
      }

      // Check if session exists and is active
      const session = await SessionModel.findOne({
        session_id: sessionId,
        hackathon_id: hackathonId,
        is_active: true
      });

      if (!session) {
        sendError(res, 'Session not found or inactive', undefined, 404);
        return;
      }

      // Check if session is currently running
      const now = new Date();
      if (now < session.start_time || now > session.end_time) {
        sendError(res, 'Session is not currently active', undefined, 400);
        return;
      }

      // Create tracking log
      const trackingLog = new TrackingLogModel({
        user_id: userId,
        hackathon_id: hackathonId,
        session_id: sessionId,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude] // GeoJSON format: [longitude, latitude]
        },
        timestamp: now
      });

      await trackingLog.save();

      sendSuccess(res, 'Check-in successful', {
        trackingId: trackingLog._id,
        userId,
        hackathonId,
        sessionId,
        location: {
          latitude,
          longitude
        },
        timestamp: trackingLog.timestamp
      }, 202);
    } catch (error) {
      console.error('Check-in error:', error);
      sendError(res, 'Failed to process check-in', undefined, 500);
    }
  }

  async getTrackingData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;
      const { startDate, endDate, limit = '100' } = req.query;

      if (!validateUUID(hackathonId)) {
        sendError(res, 'Invalid hackathon ID format', undefined, 400);
        return;
      }

      // Build query
      const query: any = { hackathon_id: hackathonId };

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate as string);
        if (endDate) query.timestamp.$lte = new Date(endDate as string);
      }

      const trackingLogs = await TrackingLogModel.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit as string));

      const data = trackingLogs.map(log => ({
        trackingId: log._id,
        userId: log.user_id,
        sessionId: log.session_id,
        location: {
          latitude: log.location.coordinates[1],
          longitude: log.location.coordinates[0]
        },
        timestamp: log.timestamp
      }));

      sendSuccess(res, 'Tracking data retrieved successfully', data);
    } catch (error) {
      console.error('Get tracking data error:', error);
      sendError(res, 'Failed to retrieve tracking data', undefined, 500);
    }
  }

  async getUserTrackingHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requesterId = req.user?.userId;
      const { hackathonId, limit = '50' } = req.query;

      if (!validateUUID(userId)) {
        sendError(res, 'Invalid user ID format', undefined, 400);
        return;
      }

      // Users can only see their own tracking history unless they're admin/organizer
      if (userId !== requesterId && !['admin', 'organizer'].includes(req.user?.role || '')) {
        sendError(res, 'Insufficient permissions', undefined, 403);
        return;
      }

      const query: any = { user_id: userId };
      if (hackathonId) {
        if (!validateUUID(hackathonId as string)) {
          sendError(res, 'Invalid hackathon ID format', undefined, 400);
          return;
        }
        query.hackathon_id = hackathonId;
      }

      const trackingLogs = await TrackingLogModel.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit as string));

      const history = trackingLogs.map(log => ({
        trackingId: log._id,
        hackathonId: log.hackathon_id,
        sessionId: log.session_id,
        location: {
          latitude: log.location.coordinates[1],
          longitude: log.location.coordinates[0]
        },
        timestamp: log.timestamp
      }));

      sendSuccess(res, 'User tracking history retrieved successfully', history);
    } catch (error) {
      console.error('Get user tracking history error:', error);
      sendError(res, 'Failed to retrieve user tracking history', undefined, 500);
    }
  }

  async getRealTimeData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;
      const { minutes = '5' } = req.query;

      if (!validateUUID(hackathonId)) {
        sendError(res, 'Invalid hackathon ID format', undefined, 400);
        return;
      }

      // Get data from the last N minutes
      const minutesAgo = new Date();
      minutesAgo.setMinutes(minutesAgo.getMinutes() - parseInt(minutes as string));

      const recentLogs = await TrackingLogModel.find({
        hackathon_id: hackathonId,
        timestamp: { $gte: minutesAgo }
      }).sort({ timestamp: -1 });

      const realTimeData = recentLogs.map(log => ({
        userId: log.user_id,
        sessionId: log.session_id,
        location: {
          latitude: log.location.coordinates[1],
          longitude: log.location.coordinates[0]
        },
        timestamp: log.timestamp
      }));

      sendSuccess(res, 'Real-time tracking data retrieved successfully', {
        data: realTimeData,
        lastUpdated: new Date(),
        timeRange: `${minutes} minutes`
      });
    } catch (error) {
      console.error('Get real-time data error:', error);
      sendError(res, 'Failed to retrieve real-time data', undefined, 500);
    }
  }

  async createSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { hackathonId, name, description, location, startTime, endTime } = req.body;

      if (!validateUUID(hackathonId)) {
        sendError(res, 'Invalid hackathon ID format', undefined, 400);
        return;
      }

      const sessionId = uuidv4();
      const sessionData: any = {
        session_id: sessionId,
        hackathon_id: hackathonId,
        name,
        start_time: new Date(startTime),
        end_time: new Date(endTime)
      };

      if (description) sessionData.description = description;
      
      if (location && location.latitude && location.longitude) {
        sessionData.location = {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        };
      }

      const session = new SessionModel(sessionData);
      await session.save();

      sendSuccess(res, 'Session created successfully', {
        sessionId: session.session_id,
        hackathonId: session.hackathon_id,
        name: session.name,
        description: session.description,
        location: session.location ? {
          latitude: session.location.coordinates[1],
          longitude: session.location.coordinates[0]
        } : undefined,
        startTime: session.start_time,
        endTime: session.end_time,
        isActive: session.is_active,
        createdAt: session.created_at
      }, 201);
    } catch (error) {
      console.error('Create session error:', error);
      sendError(res, 'Failed to create session', undefined, 500);
    }
  }

  async getSessionsByHackathon(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;
      const { active } = req.query;

      if (!validateUUID(hackathonId)) {
        sendError(res, 'Invalid hackathon ID format', undefined, 400);
        return;
      }

      const query: any = { hackathon_id: hackathonId };
      if (active !== undefined) {
        query.is_active = active === 'true';
      }

      const sessions = await SessionModel.find(query)
        .sort({ start_time: 1 });

      const sessionsData = sessions.map(session => ({
        sessionId: session.session_id,
        name: session.name,
        description: session.description,
        location: session.location ? {
          latitude: session.location.coordinates[1],
          longitude: session.location.coordinates[0]
        } : undefined,
        startTime: session.start_time,
        endTime: session.end_time,
        isActive: session.is_active,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      }));

      sendSuccess(res, 'Sessions retrieved successfully', sessionsData);
    } catch (error) {
      console.error('Get sessions error:', error);
      sendError(res, 'Failed to retrieve sessions', undefined, 500);
    }
  }

  async updateSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { name, description, location, startTime, endTime, isActive } = req.body;

      if (!validateUUID(sessionId)) {
        sendError(res, 'Invalid session ID format', undefined, 400);
        return;
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (startTime) updateData.start_time = new Date(startTime);
      if (endTime) updateData.end_time = new Date(endTime);
      if (isActive !== undefined) updateData.is_active = isActive;

      if (location && location.latitude && location.longitude) {
        updateData.location = {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        };
      }

      const session = await SessionModel.findOneAndUpdate(
        { session_id: sessionId },
        updateData,
        { new: true }
      );

      if (!session) {
        sendError(res, 'Session not found', undefined, 404);
        return;
      }

      sendSuccess(res, 'Session updated successfully', {
        sessionId: session.session_id,
        name: session.name,
        description: session.description,
        location: session.location ? {
          latitude: session.location.coordinates[1],
          longitude: session.location.coordinates[0]
        } : undefined,
        startTime: session.start_time,
        endTime: session.end_time,
        isActive: session.is_active,
        updatedAt: session.updated_at
      });
    } catch (error) {
      console.error('Update session error:', error);
      sendError(res, 'Failed to update session', undefined, 500);
    }
  }

  async deleteSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!validateUUID(sessionId)) {
        sendError(res, 'Invalid session ID format', undefined, 400);
        return;
      }

      const result = await SessionModel.deleteOne({ session_id: sessionId });

      if (result.deletedCount === 0) {
        sendError(res, 'Session not found', undefined, 404);
        return;
      }

      // Also delete related tracking logs
      await TrackingLogModel.deleteMany({ session_id: sessionId });

      sendSuccess(res, 'Session deleted successfully');
    } catch (error) {
      console.error('Delete session error:', error);
      sendError(res, 'Failed to delete session', undefined, 500);
    }
  }

  async getAttendanceAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;

      if (!validateUUID(hackathonId)) {
        sendError(res, 'Invalid hackathon ID format', undefined, 400);
        return;
      }

      // Get attendance by session
      const attendanceBySession = await TrackingLogModel.aggregate([
        { $match: { hackathon_id: hackathonId } },
        {
          $group: {
            _id: '$session_id',
            uniqueAttendees: { $addToSet: '$user_id' },
            totalCheckIns: { $sum: 1 }
          }
        },
        {
          $project: {
            sessionId: '$_id',
            uniqueAttendees: { $size: '$uniqueAttendees' },
            totalCheckIns: 1,
            _id: 0
          }
        }
      ]);

      // Get overall attendance
      const overallAttendance = await TrackingLogModel.aggregate([
        { $match: { hackathon_id: hackathonId } },
        {
          $group: {
            _id: null,
            uniqueAttendees: { $addToSet: '$user_id' },
            totalCheckIns: { $sum: 1 }
          }
        }
      ]);

      sendSuccess(res, 'Attendance analytics retrieved successfully', {
        overall: {
          uniqueAttendees: overallAttendance[0]?.uniqueAttendees?.length || 0,
          totalCheckIns: overallAttendance[0]?.totalCheckIns || 0
        },
        bySession: attendanceBySession
      });
    } catch (error) {
      console.error('Get attendance analytics error:', error);
      sendError(res, 'Failed to retrieve attendance analytics', undefined, 500);
    }
  }

  async getLocationHeatmap(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;

      if (!validateUUID(hackathonId)) {
        sendError(res, 'Invalid hackathon ID format', undefined, 400);
        return;
      }

      // Get location data for heatmap
      const locationData = await TrackingLogModel.aggregate([
        { $match: { hackathon_id: hackathonId } },
        {
          $group: {
            _id: {
              // Round coordinates to create location clusters
              lat: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 4] },
              lng: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 4] }
            },
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$user_id' }
          }
        },
        {
          $project: {
            latitude: '$_id.lat',
            longitude: '$_id.lng',
            checkInCount: '$count',
            uniqueUserCount: { $size: '$uniqueUsers' },
            _id: 0
          }
        },
        { $sort: { checkInCount: -1 } }
      ]);

      sendSuccess(res, 'Location heatmap data retrieved successfully', locationData);
    } catch (error) {
      console.error('Get location heatmap error:', error);
      sendError(res, 'Failed to retrieve location heatmap data', undefined, 500);
    }
  }

  async getTimelineAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { hackathonId } = req.params;
      const { interval = 'hour' } = req.query;

      if (!validateUUID(hackathonId)) {
        sendError(res, 'Invalid hackathon ID format', undefined, 400);
        return;
      }

      // Define grouping based on interval
      let dateGrouping: any;
      switch (interval) {
        case 'minute':
          dateGrouping = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' },
            minute: { $minute: '$timestamp' }
          };
          break;
        case 'hour':
          dateGrouping = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' }
          };
          break;
        case 'day':
          dateGrouping = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          };
          break;
        default:
          dateGrouping = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' }
          };
      }

      const timelineData = await TrackingLogModel.aggregate([
        { $match: { hackathon_id: hackathonId } },
        {
          $group: {
            _id: dateGrouping,
            checkInCount: { $sum: 1 },
            uniqueUsers: { $addToSet: '$user_id' }
          }
        },
        {
          $project: {
            period: '$_id',
            checkInCount: 1,
            uniqueUserCount: { $size: '$uniqueUsers' },
            _id: 0
          }
        },
        { $sort: { 'period.year': 1, 'period.month': 1, 'period.day': 1, 'period.hour': 1, 'period.minute': 1 } }
      ]);

      sendSuccess(res, 'Timeline analytics retrieved successfully', {
        interval,
        data: timelineData
      });
    } catch (error) {
      console.error('Get timeline analytics error:', error);
      sendError(res, 'Failed to retrieve timeline analytics', undefined, 500);
    }
  }
}

