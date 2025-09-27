import { Router } from 'express';
import { UserController } from './controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth';
import { validateRequired, validateEmailField, validatePasswordField } from '../../shared/utils/validation';

const router = Router();
const userController = new UserController();

// Public routes
router.post('/register', 
  validateRequired(['username', 'email', 'password', 'first_name', 'last_name']),
  validateEmailField,
  validatePasswordField,
  userController.register
);

router.post('/login',
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
  authorizeRoles('admin', 'organizer'),
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

