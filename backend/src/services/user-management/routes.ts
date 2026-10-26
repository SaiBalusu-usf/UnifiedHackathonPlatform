import { Router } from 'express';
import { UserController } from './controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth';
import { authRateLimit } from '../../shared/middleware/security';
import { validateRequired, validateEmailField, validatePasswordField } from '../../shared/utils/validation';

const router = Router();
const userController = new UserController();

// Public routes
router.post('/register',
  authRateLimit,
  validateRequired(['username', 'email', 'password', 'first_name', 'last_name']),
  validateEmailField,
  validatePasswordField,
  userController.register
);

router.post('/login',
  authRateLimit,
  validateRequired(['email', 'password']),
  validateEmailField,
  userController.login
);

// Protected routes
router.get('/profile',
  authenticateToken,
  userController.getProfile
);

router.put('/profile',
  authenticateToken,
  userController.updateProfile
);

router.get('/:userId',
  authenticateToken,
  userController.getUserById
);

router.put('/:userId',
  authenticateToken,
  authorizeRoles('admin'),
  userController.updateUser
);

router.get('/',
  authenticateToken,
  authorizeRoles('admin', 'organizer'),
  userController.getAllUsers
);

router.delete('/:userId',
  authenticateToken,
  authorizeRoles('admin'),
  userController.deleteUser
);

export default router;

