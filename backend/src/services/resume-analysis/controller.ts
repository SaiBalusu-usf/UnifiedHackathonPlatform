import { Request, Response } from 'express';
import { ResumeModel } from './models';
import { sendSuccess, sendError } from '../../shared/utils/response';
import { validateUUID } from '../../shared/utils/validation';
import { AuthenticatedRequest } from '../../shared/middleware/auth';
import { ParsedResume } from '../../shared/types';

export class ResumeController {
  async uploadResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.body.userId || req.user?.userId;
      const file = req.file;

      if (!file) {
        sendError(res, 'Resume file is required', undefined, 400);
        return;
      }

      if (!validateUUID(userId)) {
        sendError(res, 'Invalid user ID format', undefined, 400);
        return;
      }

      // For demo purposes, we'll simulate resume parsing
      // In a real implementation, this would use an AI service or NLP library
      const parsedResume = await this.parseResumeContent(file.buffer, file.mimetype);

      // Check if resume already exists for this user
      const existingResume = await ResumeModel.findOne({ user_id: userId });

      if (existingResume) {
        // Update existing resume
        existingResume.parsed_resume = parsedResume;
        existingResume.original_resume = `resume_${userId}_${Date.now()}.${this.getFileExtension(file.mimetype)}`;
        await existingResume.save();

        sendSuccess(res, 'Resume updated successfully', {
          userId,
          resumeId: existingResume._id,
          parsedResume
        });
      } else {
        // Create new resume
        const newResume = new ResumeModel({
          user_id: userId,
          original_resume: `resume_${userId}_${Date.now()}.${this.getFileExtension(file.mimetype)}`,
          parsed_resume: parsedResume
        });

        await newResume.save();

        sendSuccess(res, 'Resume uploaded and parsed successfully', {
          userId,
          resumeId: newResume._id,
          parsedResume
        }, 201);
      }
    } catch (error) {
      console.error('Upload resume error:', error);
      sendError(res, 'Failed to upload and parse resume', undefined, 500);
    }
  }

  async getParsedResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requesterId = req.user?.userId;

      if (!validateUUID(userId)) {
        sendError(res, 'Invalid user ID format', undefined, 400);
        return;
      }

      // Users can only access their own resume unless they're admin/organizer
      if (userId !== requesterId && !['admin', 'organizer'].includes(req.user?.role || '')) {
        sendError(res, 'Insufficient permissions', undefined, 403);
        return;
      }

      const resume = await ResumeModel.findOne({ user_id: userId });

      if (!resume) {
        sendError(res, 'Resume not found for user', undefined, 404);
        return;
      }

      sendSuccess(res, 'Parsed resume retrieved successfully', {
        userId: resume.user_id,
        parsedResume: resume.parsed_resume,
        createdAt: resume.created_at,
        updatedAt: resume.updated_at
      });
    } catch (error) {
      console.error('Get parsed resume error:', error);
      sendError(res, 'Failed to retrieve parsed resume', undefined, 500);
    }
  }

  async updateParsedResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { parsedResume } = req.body;
      const requesterId = req.user?.userId;

      if (!validateUUID(userId)) {
        sendError(res, 'Invalid user ID format', undefined, 400);
        return;
      }

      // Users can only update their own resume unless they're admin
      if (userId !== requesterId && req.user?.role !== 'admin') {
        sendError(res, 'Insufficient permissions', undefined, 403);
        return;
      }

      if (!parsedResume) {
        sendError(res, 'Parsed resume data is required', undefined, 400);
        return;
      }

      const resume = await ResumeModel.findOne({ user_id: userId });

      if (!resume) {
        sendError(res, 'Resume not found for user', undefined, 404);
        return;
      }

      resume.parsed_resume = parsedResume;
      await resume.save();

      sendSuccess(res, 'Parsed resume updated successfully', {
        userId: resume.user_id,
        parsedResume: resume.parsed_resume,
        updatedAt: resume.updated_at
      });
    } catch (error) {
      console.error('Update parsed resume error:', error);
      sendError(res, 'Failed to update parsed resume', undefined, 500);
    }
  }

  async deleteResume(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const requesterId = req.user?.userId;

      if (!validateUUID(userId)) {
        sendError(res, 'Invalid user ID format', undefined, 400);
        return;
      }

      // Users can only delete their own resume unless they're admin
      if (userId !== requesterId && req.user?.role !== 'admin') {
        sendError(res, 'Insufficient permissions', undefined, 403);
        return;
      }

      const result = await ResumeModel.deleteOne({ user_id: userId });

      if (result.deletedCount === 0) {
        sendError(res, 'Resume not found for user', undefined, 404);
        return;
      }

      sendSuccess(res, 'Resume deleted successfully');
    } catch (error) {
      console.error('Delete resume error:', error);
      sendError(res, 'Failed to delete resume', undefined, 500);
    }
  }

  async getAllResumes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const total = await ResumeModel.countDocuments();
      const resumes = await ResumeModel.find()
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

      const totalPages = Math.ceil(total / limit);

      sendSuccess(res, 'Resumes retrieved successfully', {
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
    } catch (error) {
      console.error('Get all resumes error:', error);
      sendError(res, 'Failed to retrieve resumes', undefined, 500);
    }
  }

  async searchBySkills(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { skills, limit = '10' } = req.query;

      if (!skills) {
        sendError(res, 'Skills parameter is required', undefined, 400);
        return;
      }

      const skillsArray = (skills as string).split(',').map(skill => skill.trim());

      const resumes = await ResumeModel.find({
        'parsed_resume.skills': { $in: skillsArray }
      })
      .limit(parseInt(limit as string))
      .sort({ created_at: -1 });

      const results = resumes.map(resume => ({
        userId: resume.user_id,
        skills: resume.parsed_resume.skills,
        matchingSkills: resume.parsed_resume.skills.filter(skill => 
          skillsArray.some(searchSkill => 
            skill.toLowerCase().includes(searchSkill.toLowerCase())
          )
        ),
        createdAt: resume.created_at
      }));

      sendSuccess(res, 'Resume search completed successfully', results);
    } catch (error) {
      console.error('Search by skills error:', error);
      sendError(res, 'Failed to search resumes by skills', undefined, 500);
    }
  }

  async getResumeStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const totalResumes = await ResumeModel.countDocuments();
      
      // Get top skills
      const skillsAggregation = await ResumeModel.aggregate([
        { $unwind: '$parsed_resume.skills' },
        { $group: { _id: '$parsed_resume.skills', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Get resumes uploaded in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentResumes = await ResumeModel.countDocuments({
        created_at: { $gte: thirtyDaysAgo }
      });

      sendSuccess(res, 'Resume statistics retrieved successfully', {
        totalResumes,
        recentResumes,
        topSkills: skillsAggregation.map(item => ({
          skill: item._id,
          count: item.count
        }))
      });
    } catch (error) {
      console.error('Get resume stats error:', error);
      sendError(res, 'Failed to retrieve resume statistics', undefined, 500);
    }
  }

  private async parseResumeContent(buffer: Buffer, mimetype: string): Promise<ParsedResume> {
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

    const detectedSkills = commonSkills.filter(skill => 
      content.includes(skill.toLowerCase())
    );

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

  private getFileExtension(mimetype: string): string {
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

