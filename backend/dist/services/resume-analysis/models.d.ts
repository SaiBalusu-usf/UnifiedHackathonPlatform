import mongoose, { Document } from 'mongoose';
import { Resume } from '../../shared/types';
export interface ResumeDocument extends Resume, Document {
}
export declare const ResumeModel: mongoose.Model<unknown, unknown, unknown, unknown, mongoose.Document<unknown, unknown, unknown, unknown, unknown> & Omit<{
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, never>, ResumeDocument>;
//# sourceMappingURL=models.d.ts.map