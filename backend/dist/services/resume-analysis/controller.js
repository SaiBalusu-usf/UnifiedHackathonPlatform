"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeController = void 0;
const models_1 = require("./models");
const response_1 = require("../../shared/utils/response");
const validation_1 = require("../../shared/utils/validation");
class ResumeController {
    async uploadResume(req, res) {
        try {
            const userId = req.body.userId || req.user?.userId;
            const file = req.file;
            if (!file) {
                (0, response_1.sendError)(res, 'Resume file is required', undefined, 400);
                return;
            }
            if (!(0, validation_1.validateUUID)(userId)) {
                (0, response_1.sendError)(res, 'Invalid user ID format', undefined, 400);
                return;
            }
            // For demo purposes, we'll simulate resume parsing
            // In a real implementation, this would use an AI service or NLP library
            const parsedResume = await this.parseResumeContent(file.buffer, file.mimetype);
            // Check if resume already exists for this user
            const existingResume = await models_1.ResumeModel.findOne({ user_id: userId });
            if (existingResume) {
                // Update existing resume
                existingResume.parsed_resume = parsedResume;
                existingResume.original_resume = `resume_${userId}_${Date.now()}.${this.getFileExtension(file.mimetype)}`;
                await existingResume.save();
                (0, response_1.sendSuccess)(res, 'Resume updated successfully', {
                    userId,
                    resumeId: existingResume._id,
                    parsedResume
                });
            }
            else {
                // Create new resume
                const newResume = new models_1.ResumeModel({
                    user_id: userId,
                    original_resume: `resume_${userId}_${Date.now()}.${this.getFileExtension(file.mimetype)}`,
                    parsed_resume: parsedResume
                });
                await newResume.save();
                (0, response_1.sendSuccess)(res, 'Resume uploaded and parsed successfully', {
                    userId,
                    resumeId: newResume._id,
                    parsedResume
                }, 201);
            }
        }
        catch (error) {
            console.error('Upload resume error:', error);
            (0, response_1.sendError)(res, 'Failed to upload and parse resume', undefined, 500);
        }
    }
    async getParsedResume(req, res) {
        try {
            const { userId } = req.params;
            const requesterId = req.user?.userId;
            if (!(0, validation_1.validateUUID)(userId)) {
                (0, response_1.sendError)(res, 'Invalid user ID format', undefined, 400);
                return;
            }
            // Users can only access their own resume unless they're admin/organizer
            if (userId !== requesterId && !['admin', 'organizer'].includes(req.user?.role || '')) {
                (0, response_1.sendError)(res, 'Insufficient permissions', undefined, 403);
                return;
            }
            const resume = await models_1.ResumeModel.findOne({ user_id: userId });
            if (!resume) {
                (0, response_1.sendError)(res, 'Resume not found for user', undefined, 404);
                return;
            }
            (0, response_1.sendSuccess)(res, 'Parsed resume retrieved successfully', {
                userId: resume.user_id,
                parsedResume: resume.parsed_resume,
                createdAt: resume.created_at,
                updatedAt: resume.updated_at
            });
        }
        catch (error) {
            console.error('Get parsed resume error:', error);
            (0, response_1.sendError)(res, 'Failed to retrieve parsed resume', undefined, 500);
        }
    }
    async updateParsedResume(req, res) {
        try {
            const { userId } = req.params;
            const { parsedResume } = req.body;
            const requesterId = req.user?.userId;
            if (!(0, validation_1.validateUUID)(userId)) {
                (0, response_1.sendError)(res, 'Invalid user ID format', undefined, 400);
                return;
            }
            // Users can only update their own resume unless they're admin
            if (userId !== requesterId && req.user?.role !== 'admin') {
                (0, response_1.sendError)(res, 'Insufficient permissions', undefined, 403);
                return;
            }
            if (!parsedResume) {
                (0, response_1.sendError)(res, 'Parsed resume data is required', undefined, 400);
                return;
            }
            const resume = await models_1.ResumeModel.findOne({ user_id: userId });
            if (!resume) {
                (0, response_1.sendError)(res, 'Resume not found for user', undefined, 404);
                return;
            }
            resume.parsed_resume = parsedResume;
            await resume.save();
            (0, response_1.sendSuccess)(res, 'Parsed resume updated successfully', {
                userId: resume.user_id,
                parsedResume: resume.parsed_resume,
                updatedAt: resume.updated_at
            });
        }
        catch (error) {
            console.error('Update parsed resume error:', error);
            (0, response_1.sendError)(res, 'Failed to update parsed resume', undefined, 500);
        }
    }
    async deleteResume(req, res) {
        try {
            const { userId } = req.params;
            const requesterId = req.user?.userId;
            if (!(0, validation_1.validateUUID)(userId)) {
                (0, response_1.sendError)(res, 'Invalid user ID format', undefined, 400);
                return;
            }
            // Users can only delete their own resume unless they're admin
            if (userId !== requesterId && req.user?.role !== 'admin') {
                (0, response_1.sendError)(res, 'Insufficient permissions', undefined, 403);
                return;
            }
            const result = await models_1.ResumeModel.deleteOne({ user_id: userId });
            if (result.deletedCount === 0) {
                (0, response_1.sendError)(res, 'Resume not found for user', undefined, 404);
                return;
            }
            (0, response_1.sendSuccess)(res, 'Resume deleted successfully');
        }
        catch (error) {
            console.error('Delete resume error:', error);
            (0, response_1.sendError)(res, 'Failed to delete resume', undefined, 500);
        }
    }
    async getAllResumes(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const total = await models_1.ResumeModel.countDocuments();
            const resumes = await models_1.ResumeModel.find()
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit);
            const totalPages = Math.ceil(total / limit);
            (0, response_1.sendSuccess)(res, 'Resumes retrieved successfully', {
                resumes: resumes.map(resume => ({
                    userId: resume.user_id,
                    parsedResume: resume.parsed_resume,
                    createdAt: resume.created_at,
                    updatedAt: resume.updated_at
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            });
        }
        catch (error) {
            console.error('Get all resumes error:', error);
            (0, response_1.sendError)(res, 'Failed to retrieve resumes', undefined, 500);
        }
    }
    async searchBySkills(req, res) {
        try {
            const { skills, limit = '10' } = req.query;
            if (!skills) {
                (0, response_1.sendError)(res, 'Skills parameter is required', undefined, 400);
                return;
            }
            const skillsArray = skills.split(',').map(skill => skill.trim());
            const resumes = await models_1.ResumeModel.find({
                'parsed_resume.skills': { $in: skillsArray }
            })
                .limit(parseInt(limit))
                .sort({ created_at: -1 });
            const results = resumes.map(resume => ({
                userId: resume.user_id,
                skills: resume.parsed_resume.skills,
                matchingSkills: resume.parsed_resume.skills.filter(skill => skillsArray.some(searchSkill => skill.toLowerCase().includes(searchSkill.toLowerCase()))),
                createdAt: resume.created_at
            }));
            (0, response_1.sendSuccess)(res, 'Resume search completed successfully', results);
        }
        catch (error) {
            console.error('Search by skills error:', error);
            (0, response_1.sendError)(res, 'Failed to search resumes by skills', undefined, 500);
        }
    }
    async getResumeStats(req, res) {
        try {
            const totalResumes = await models_1.ResumeModel.countDocuments();
            // Get top skills
            const skillsAggregation = await models_1.ResumeModel.aggregate([
                { $unwind: '$parsed_resume.skills' },
                { $group: { _id: '$parsed_resume.skills', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);
            // Get resumes uploaded in the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentResumes = await models_1.ResumeModel.countDocuments({
                created_at: { $gte: thirtyDaysAgo }
            });
            (0, response_1.sendSuccess)(res, 'Resume statistics retrieved successfully', {
                totalResumes,
                recentResumes,
                topSkills: skillsAggregation.map(item => ({
                    skill: item._id,
                    count: item.count
                }))
            });
        }
        catch (error) {
            console.error('Get resume stats error:', error);
            (0, response_1.sendError)(res, 'Failed to retrieve resume statistics', undefined, 500);
        }
    }
    async parseResumeContent(buffer, mimetype) {
        // This is a simplified mock implementation
        // In a real application, you would use libraries like:
        // - pdf-parse for PDF files
        // - mammoth for DOCX files
        // - Natural language processing libraries for text extraction
        // - AI services like OpenAI GPT for intelligent parsing
        const content = buffer.toString('utf-8').toLowerCase();
        // Mock skill extraction
        const commonSkills = [
            'javascript', 'python', 'java', 'react', 'node.js', 'typescript',
            'html', 'css', 'sql', 'mongodb', 'postgresql', 'git', 'docker',
            'kubernetes', 'aws', 'azure', 'machine learning', 'data science',
            'angular', 'vue.js', 'express', 'django', 'flask', 'spring boot'
        ];
        const detectedSkills = commonSkills.filter(skill => content.includes(skill.toLowerCase()));
        // Mock experience extraction
        const experience = [
            {
                title: 'Software Developer',
                company: 'Tech Company',
                years: '2020-2023',
                description: 'Developed web applications using modern technologies'
            }
        ];
        // Mock education extraction
        const education = [
            {
                degree: 'Bachelor of Science in Computer Science',
                institution: 'University',
                year: 2020
            }
        ];
        return {
            skills: detectedSkills,
            experience,
            education
        };
    }
    getFileExtension(mimetype) {
        switch (mimetype) {
            case 'application/pdf':
                return 'pdf';
            case 'application/msword':
                return 'doc';
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                return 'docx';
            case 'text/plain':
                return 'txt';
            default:
                return 'bin';
        }
    }
}
exports.ResumeController = ResumeController;
//# sourceMappingURL=controller.js.map