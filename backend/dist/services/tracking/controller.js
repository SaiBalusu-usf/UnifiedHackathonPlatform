"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingController = void 0;
const uuid_1 = require("uuid");
const models_1 = require("./models");
const response_1 = require("../../shared/utils/response");
const validation_1 = require("../../shared/utils/validation");
class TrackingController {
    async checkIn(req, res) {
        try {
            const { hackathonId, sessionId, location } = req.body;
            const userId = req.user?.userId;
            if (!(0, validation_1.validateUUID)(hackathonId) || !(0, validation_1.validateUUID)(sessionId)) {
                (0, response_1.sendError)(res, 'Invalid hackathon ID or session ID format', undefined, 400);
                return;
            }
            if (!location || !location.latitude || !location.longitude) {
                (0, response_1.sendError)(res, 'Valid location coordinates are required', undefined, 400);
                return;
            }
            // Validate coordinates
            const { latitude, longitude } = location;
            if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
                (0, response_1.sendError)(res, 'Invalid coordinates', undefined, 400);
                return;
            }
            // Check if session exists and is active
            const session = await models_1.SessionModel.findOne({
                session_id: sessionId,
                hackathon_id: hackathonId,
                is_active: true
            });
            if (!session) {
                (0, response_1.sendError)(res, 'Session not found or inactive', undefined, 404);
                return;
            }
            // Check if session is currently running
            const now = new Date();
            if (now < session.start_time || now > session.end_time) {
                (0, response_1.sendError)(res, 'Session is not currently active', undefined, 400);
                return;
            }
            // Create tracking log
            const trackingLog = new models_1.TrackingLogModel({
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
            (0, response_1.sendSuccess)(res, 'Check-in successful', {
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
        }
        catch (error) {
            console.error('Check-in error:', error);
            (0, response_1.sendError)(res, 'Failed to process check-in', undefined, 500);
        }
    }
    async getTrackingData(req, res) {
        try {
            const { hackathonId } = req.params;
            const { startDate, endDate, limit = '100' } = req.query;
            if (!(0, validation_1.validateUUID)(hackathonId)) {
                (0, response_1.sendError)(res, 'Invalid hackathon ID format', undefined, 400);
                return;
            }
            // Build query
            const query = { hackathon_id: hackathonId };
            if (startDate || endDate) {
                query.timestamp = {};
                if (startDate)
                    query.timestamp.$gte = new Date(startDate);
                if (endDate)
                    query.timestamp.$lte = new Date(endDate);
            }
            const trackingLogs = await models_1.TrackingLogModel.find(query)
                .sort({ timestamp: -1 })
                .limit(parseInt(limit));
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
            (0, response_1.sendSuccess)(res, 'Tracking data retrieved successfully', data);
        }
        catch (error) {
            console.error('Get tracking data error:', error);
            (0, response_1.sendError)(res, 'Failed to retrieve tracking data', undefined, 500);
        }
    }
    async getUserTrackingHistory(req, res) {
        try {
            const { userId } = req.params;
            const requesterId = req.user?.userId;
            const { hackathonId, limit = '50' } = req.query;
            if (!(0, validation_1.validateUUID)(userId)) {
                (0, response_1.sendError)(res, 'Invalid user ID format', undefined, 400);
                return;
            }
            // Users can only see their own tracking history unless they're admin/organizer
            if (userId !== requesterId && !['admin', 'organizer'].includes(req.user?.role || '')) {
                (0, response_1.sendError)(res, 'Insufficient permissions', undefined, 403);
                return;
            }
            const query = { user_id: userId };
            if (hackathonId) {
                if (!(0, validation_1.validateUUID)(hackathonId)) {
                    (0, response_1.sendError)(res, 'Invalid hackathon ID format', undefined, 400);
                    return;
                }
                query.hackathon_id = hackathonId;
            }
            const trackingLogs = await models_1.TrackingLogModel.find(query)
                .sort({ timestamp: -1 })
                .limit(parseInt(limit));
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
            (0, response_1.sendSuccess)(res, 'User tracking history retrieved successfully', history);
        }
        catch (error) {
            console.error('Get user tracking history error:', error);
            (0, response_1.sendError)(res, 'Failed to retrieve user tracking history', undefined, 500);
        }
    }
    async getRealTimeData(req, res) {
        try {
            const { hackathonId } = req.params;
            const { minutes = '5' } = req.query;
            if (!(0, validation_1.validateUUID)(hackathonId)) {
                (0, response_1.sendError)(res, 'Invalid hackathon ID format', undefined, 400);
                return;
            }
            // Get data from the last N minutes
            const minutesAgo = new Date();
            minutesAgo.setMinutes(minutesAgo.getMinutes() - parseInt(minutes));
            const recentLogs = await models_1.TrackingLogModel.find({
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
            (0, response_1.sendSuccess)(res, 'Real-time tracking data retrieved successfully', {
                data: realTimeData,
                lastUpdated: new Date(),
                timeRange: `${minutes} minutes`
            });
        }
        catch (error) {
            console.error('Get real-time data error:', error);
            (0, response_1.sendError)(res, 'Failed to retrieve real-time data', undefined, 500);
        }
    }
    async createSession(req, res) {
        try {
            const { hackathonId, name, description, location, startTime, endTime } = req.body;
            if (!(0, validation_1.validateUUID)(hackathonId)) {
                (0, response_1.sendError)(res, 'Invalid hackathon ID format', undefined, 400);
                return;
            }
            const sessionId = (0, uuid_1.v4)();
            const sessionData = {
                session_id: sessionId,
                hackathon_id: hackathonId,
                name,
                start_time: new Date(startTime),
                end_time: new Date(endTime)
            };
            if (description)
                sessionData.description = description;
            if (location && location.latitude && location.longitude) {
                sessionData.location = {
                    type: 'Point',
                    coordinates: [location.longitude, location.latitude]
                };
            }
            const session = new models_1.SessionModel(sessionData);
            await session.save();
            (0, response_1.sendSuccess)(res, 'Session created successfully', {
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
        }
        catch (error) {
            console.error('Create session error:', error);
            (0, response_1.sendError)(res, 'Failed to create session', undefined, 500);
        }
    }
    async getSessionsByHackathon(req, res) {
        try {
            const { hackathonId } = req.params;
            const { active } = req.query;
            if (!(0, validation_1.validateUUID)(hackathonId)) {
                (0, response_1.sendError)(res, 'Invalid hackathon ID format', undefined, 400);
                return;
            }
            const query = { hackathon_id: hackathonId };
            if (active !== undefined) {
                query.is_active = active === 'true';
            }
            const sessions = await models_1.SessionModel.find(query)
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
            (0, response_1.sendSuccess)(res, 'Sessions retrieved successfully', sessionsData);
        }
        catch (error) {
            console.error('Get sessions error:', error);
            (0, response_1.sendError)(res, 'Failed to retrieve sessions', undefined, 500);
        }
    }
    async updateSession(req, res) {
        try {
            const { sessionId } = req.params;
            const { name, description, location, startTime, endTime, isActive } = req.body;
            if (!(0, validation_1.validateUUID)(sessionId)) {
                (0, response_1.sendError)(res, 'Invalid session ID format', undefined, 400);
                return;
            }
            const updateData = {};
            if (name)
                updateData.name = name;
            if (description !== undefined)
                updateData.description = description;
            if (startTime)
                updateData.start_time = new Date(startTime);
            if (endTime)
                updateData.end_time = new Date(endTime);
            if (isActive !== undefined)
                updateData.is_active = isActive;
            if (location && location.latitude && location.longitude) {
                updateData.location = {
                    type: 'Point',
                    coordinates: [location.longitude, location.latitude]
                };
            }
            const session = await models_1.SessionModel.findOneAndUpdate({ session_id: sessionId }, updateData, { new: true });
            if (!session) {
                (0, response_1.sendError)(res, 'Session not found', undefined, 404);
                return;
            }
            (0, response_1.sendSuccess)(res, 'Session updated successfully', {
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
        }
        catch (error) {
            console.error('Update session error:', error);
            (0, response_1.sendError)(res, 'Failed to update session', undefined, 500);
        }
    }
    async deleteSession(req, res) {
        try {
            const { sessionId } = req.params;
            if (!(0, validation_1.validateUUID)(sessionId)) {
                (0, response_1.sendError)(res, 'Invalid session ID format', undefined, 400);
                return;
            }
            const result = await models_1.SessionModel.deleteOne({ session_id: sessionId });
            if (result.deletedCount === 0) {
                (0, response_1.sendError)(res, 'Session not found', undefined, 404);
                return;
            }
            // Also delete related tracking logs
            await models_1.TrackingLogModel.deleteMany({ session_id: sessionId });
            (0, response_1.sendSuccess)(res, 'Session deleted successfully');
        }
        catch (error) {
            console.error('Delete session error:', error);
            (0, response_1.sendError)(res, 'Failed to delete session', undefined, 500);
        }
    }
    async getAttendanceAnalytics(req, res) {
        try {
            const { hackathonId } = req.params;
            if (!(0, validation_1.validateUUID)(hackathonId)) {
                (0, response_1.sendError)(res, 'Invalid hackathon ID format', undefined, 400);
                return;
            }
            // Get attendance by session
            const attendanceBySession = await models_1.TrackingLogModel.aggregate([
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
            const overallAttendance = await models_1.TrackingLogModel.aggregate([
                { $match: { hackathon_id: hackathonId } },
                {
                    $group: {
                        _id: null,
                        uniqueAttendees: { $addToSet: '$user_id' },
                        totalCheckIns: { $sum: 1 }
                    }
                }
            ]);
            (0, response_1.sendSuccess)(res, 'Attendance analytics retrieved successfully', {
                overall: {
                    uniqueAttendees: overallAttendance[0]?.uniqueAttendees?.length || 0,
                    totalCheckIns: overallAttendance[0]?.totalCheckIns || 0
                },
                bySession: attendanceBySession
            });
        }
        catch (error) {
            console.error('Get attendance analytics error:', error);
            (0, response_1.sendError)(res, 'Failed to retrieve attendance analytics', undefined, 500);
        }
    }
    async getLocationHeatmap(req, res) {
        try {
            const { hackathonId } = req.params;
            if (!(0, validation_1.validateUUID)(hackathonId)) {
                (0, response_1.sendError)(res, 'Invalid hackathon ID format', undefined, 400);
                return;
            }
            // Get location data for heatmap
            const locationData = await models_1.TrackingLogModel.aggregate([
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
            (0, response_1.sendSuccess)(res, 'Location heatmap data retrieved successfully', locationData);
        }
        catch (error) {
            console.error('Get location heatmap error:', error);
            (0, response_1.sendError)(res, 'Failed to retrieve location heatmap data', undefined, 500);
        }
    }
    async getTimelineAnalytics(req, res) {
        try {
            const { hackathonId } = req.params;
            const { interval = 'hour' } = req.query;
            if (!(0, validation_1.validateUUID)(hackathonId)) {
                (0, response_1.sendError)(res, 'Invalid hackathon ID format', undefined, 400);
                return;
            }
            // Define grouping based on interval
            let dateGrouping;
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
            const timelineData = await models_1.TrackingLogModel.aggregate([
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
            (0, response_1.sendSuccess)(res, 'Timeline analytics retrieved successfully', {
                interval,
                data: timelineData
            });
        }
        catch (error) {
            console.error('Get timeline analytics error:', error);
            (0, response_1.sendError)(res, 'Failed to retrieve timeline analytics', undefined, 500);
        }
    }
}
exports.TrackingController = TrackingController;
//# sourceMappingURL=controller.js.map