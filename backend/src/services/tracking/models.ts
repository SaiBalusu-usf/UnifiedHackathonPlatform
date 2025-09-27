import mongoose, { Schema, Document } from 'mongoose';
import { TrackingLog } from '../../shared/types';

// GeoJSON Point schema
const PointSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: function(coords: number[]) {
        return coords.length === 2 && 
               coords[0] >= -180 && coords[0] <= 180 && // longitude
               coords[1] >= -90 && coords[1] <= 90;     // latitude
      },
      message: 'Coordinates must be [longitude, latitude] with valid ranges'
    }
  }
}, { _id: false });

// Main tracking log schema
const TrackingLogSchema = new Schema<TrackingLog>({
  user_id: { type: String, required: true },
  hackathon_id: { type: String, required: true },
  session_id: { type: String, required: true },
  location: { type: PointSchema, required: true },
  timestamp: { type: Date, default: Date.now, required: true }
});

// Create indexes for efficient queries
TrackingLogSchema.index({ user_id: 1, timestamp: -1 });
TrackingLogSchema.index({ hackathon_id: 1, timestamp: -1 });
TrackingLogSchema.index({ session_id: 1, timestamp: -1 });
TrackingLogSchema.index({ location: '2dsphere' }); // Geospatial index
TrackingLogSchema.index({ timestamp: -1 });

export interface TrackingLogDocument extends TrackingLog, Document {}

export const TrackingLogModel = mongoose.model<TrackingLogDocument>('TrackingLog', TrackingLogSchema);

// Session schema for tracking active sessions
const SessionSchema = new Schema({
  session_id: { type: String, required: true, unique: true },
  hackathon_id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  location: { type: PointSchema },
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Update the updated_at field before saving
SessionSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

SessionSchema.index({ hackathon_id: 1, is_active: 1 });
SessionSchema.index({ start_time: 1, end_time: 1 });

export interface SessionDocument extends Document {
  session_id: string;
  hackathon_id: string;
  name: string;
  description?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  start_time: Date;
  end_time: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export const SessionModel = mongoose.model<SessionDocument>('Session', SessionSchema);

