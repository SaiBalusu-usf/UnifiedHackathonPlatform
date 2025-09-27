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
exports.ResumeModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Experience schema
const ExperienceSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    company: { type: String, required: true },
    years: { type: String, required: true },
    description: { type: String }
}, { _id: false });
// Education schema
const EducationSchema = new mongoose_1.Schema({
    degree: { type: String, required: true },
    institution: { type: String, required: true },
    year: { type: Number, required: true },
    gpa: { type: Number }
}, { _id: false });
// Parsed resume schema
const ParsedResumeSchema = new mongoose_1.Schema({
    skills: [{ type: String }],
    experience: [ExperienceSchema],
    education: [EducationSchema]
}, { _id: false });
// Main resume schema
const ResumeSchema = new mongoose_1.Schema({
    user_id: { type: String, required: true, unique: true },
    original_resume: { type: String }, // URL to stored file
    parsed_resume: { type: ParsedResumeSchema, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});
// Update the updated_at field before saving
ResumeSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});
// Create indexes
ResumeSchema.index({ user_id: 1 });
ResumeSchema.index({ 'parsed_resume.skills': 1 });
ResumeSchema.index({ created_at: -1 });
exports.ResumeModel = mongoose_1.default.model('Resume', ResumeSchema);
//# sourceMappingURL=models.js.map