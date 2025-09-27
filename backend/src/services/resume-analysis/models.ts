import mongoose, { Schema, Document } from 'mongoose';
import { Resume, ParsedResume, Experience, Education } from '../../shared/types';

// Experience schema
const ExperienceSchema = new Schema<Experience>({
  title: { type: String, required: true },
  company: { type: String, required: true },
  years: { type: String, required: true },
  description: { type: String }
}, { _id: false });

// Education schema
const EducationSchema = new Schema<Education>({
  degree: { type: String, required: true },
  institution: { type: String, required: true },
  year: { type: Number, required: true },
  gpa: { type: Number }
}, { _id: false });

// Parsed resume schema
const ParsedResumeSchema = new Schema<ParsedResume>({
  skills: [{ type: String }],
  experience: [ExperienceSchema],
  education: [EducationSchema]
}, { _id: false });

// Main resume schema
const ResumeSchema = new Schema<Resume>({
  user_id: { type: String, required: true, unique: true },
  original_resume: { type: String }, // URL to stored file
  parsed_resume: { type: ParsedResumeSchema, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Update the updated_at field before saving
ResumeSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Create indexes
ResumeSchema.index({ user_id: 1 });
ResumeSchema.index({ 'parsed_resume.skills': 1 });
ResumeSchema.index({ created_at: -1 });

export interface ResumeDocument extends Resume, Document {}

export const ResumeModel = mongoose.model<ResumeDocument>('Resume', ResumeSchema);

