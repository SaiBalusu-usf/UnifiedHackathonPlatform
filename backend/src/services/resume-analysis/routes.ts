import { Router } from 'express';
import multer from 'multer';
import { ResumeController } from './controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth';

const router = Router();
const resumeController = new ResumeController();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, DOC, DOCX files
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

// Resume upload and parsing
router.post('/',
  authenticateToken,
  upload.single('resumeFile'),
  resumeController.uploadResume
);

// Get parsed resume for a user
router.get('/:userId',
  authenticateToken,
  resumeController.getParsedResume
);

// Update parsed resume manually
router.put('/:userId',
  authenticateToken,
  resumeController.updateParsedResume
);

// Delete resume
router.delete('/:userId',
  authenticateToken,
  resumeController.deleteResume
);

// Get all resumes (admin only)
router.get('/',
  authenticateToken,
  authorizeRoles('admin'),
  resumeController.getAllResumes
);

// Search resumes by skills
router.get('/search/skills',
  authenticateToken,
  resumeController.searchBySkills
);

// Get resume statistics
router.get('/stats/overview',
  authenticateToken,
  authorizeRoles('admin', 'organizer'),
  resumeController.getResumeStats
);

export default router;

