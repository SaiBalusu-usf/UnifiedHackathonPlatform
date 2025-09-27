"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const controller_1 = require("./controller");
const auth_1 = require("../../shared/middleware/auth");
const router = (0, express_1.Router)();
const resumeController = new controller_1.ResumeController();
// Configure multer for file uploads
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
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
        }
        else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
        }
    }
});
// Resume upload and parsing
router.post('/', auth_1.authenticateToken, upload.single('resumeFile'), resumeController.uploadResume);
// Get parsed resume for a user
router.get('/:userId', auth_1.authenticateToken, resumeController.getParsedResume);
// Update parsed resume manually
router.put('/:userId', auth_1.authenticateToken, resumeController.updateParsedResume);
// Delete resume
router.delete('/:userId', auth_1.authenticateToken, resumeController.deleteResume);
// Get all resumes (admin only)
router.get('/', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('admin'), resumeController.getAllResumes);
// Search resumes by skills
router.get('/search/skills', auth_1.authenticateToken, resumeController.searchBySkills);
// Get resume statistics
router.get('/stats/overview', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('admin', 'organizer'), resumeController.getResumeStats);
exports.default = router;
//# sourceMappingURL=routes.js.map