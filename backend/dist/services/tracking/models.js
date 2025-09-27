"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionModel = exports.TrackingLogModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// GeoJSON Point schema
const PointSchema = new mongoose_1.Schema({
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
            validator: function (coords) {
                return coords.length === 2 &&
                    coords[0] >= -180 && coords[0] <= 180 && // longitude
                    coords[1] >= -90 && coords[1] <= 90; // latitude
            },
            message: 'Coordinates must be [longitude, latitude] with valid ranges'
        }
    }
}, { _id: false });
// Main tracking log schema
const TrackingLogSchema = new mongoose_1.Schema({
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
exports.TrackingLogModel = mongoose_1.default.model('TrackingLog', TrackingLogSchema);
// Session schema for tracking active sessions
const SessionSchema = new mongoose_1.Schema({
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
SessionSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});
SessionSchema.index({ hackathon_id: 1, is_active: 1 });
SessionSchema.index({ start_time: 1, end_time: 1 });
exports.SessionModel = mongoose_1.default.model('Session', SessionSchema);
//# sourceMappingURL=models.js.map