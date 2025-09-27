import mongoose, { Document } from 'mongoose';
import { TrackingLog } from '../../shared/types';
export interface TrackingLogDocument extends TrackingLog, Document {
}
export declare const TrackingLogModel: mongoose.Model<unknown, unknown, unknown, unknown, mongoose.Document<unknown, unknown, unknown, unknown, unknown> & Omit<{
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, never>, TrackingLogDocument>;
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
export declare const SessionModel: mongoose.Model<SessionDocument, {}, {}, {}, mongoose.Document<unknown, {}, SessionDocument, {}, {}> & SessionDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=models.d.ts.map