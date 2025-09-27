import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pgPool } from '../../config/database';
import { sendSuccess, sendError } from '../../shared/utils/response';
import { validateUUID } from '../../shared/utils/validation';
import { User, JwtPayload } from '../../shared/types';
import { AuthenticatedRequest } from '../../shared/middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export class UserController {
  async register(req: Request, res: Response): Promise<void> {
    const { username, email, password, first_name, last_name, role = 'participant' } = req.body;

    try {
      // Check if user already exists
      const existingUser = await pgPool.query(
        'SELECT user_id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );

      if (existingUser.rows.length > 0) {
        sendError(res, 'User with this email or username already exists', undefined, 409);
        return;
      }

      // Hash password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user_id = uuidv4();
      const now = new Date();

      const result = await pgPool.query(
        `INSERT INTO users (user_id, username, email, password_hash, first_name, last_name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING user_id, username, email, first_name, last_name, role, created_at`,
        [user_id, username, email, password_hash, first_name, last_name, role, now, now]
      );

      const newUser = result.rows[0];

      // Create profile entry
      const profile_id = uuidv4();
      await pgPool.query(
        `INSERT INTO profiles (profile_id, user_id, skills, interests, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [profile_id, user_id, [], [], now, now]
      );

      sendSuccess(res, 'User registered successfully', {
        userId: newUser.user_id,
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role,
        createdAt: newUser.created_at
      }, 201);
    } catch (error) {
      console.error('Registration error:', error);
      sendError(res, 'Failed to register user', undefined, 500);
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    try {
      // Find user
      const result = await pgPool.query(
        'SELECT user_id, email, password_hash, role FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        sendError(res, 'Invalid credentials', undefined, 401);
        return;
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        sendError(res, 'Invalid credentials', undefined, 401);
        return;
      }

      // Generate JWT
      const payload: JwtPayload = {
        userId: user.user_id,
        email: user.email,
        role: user.role
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      sendSuccess(res, 'Login successful', { token });
    } catch (error) {
      console.error('Login error:', error);
      sendError(res, 'Failed to login', undefined, 500);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      const result = await pgPool.query(
        `SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, u.role, u.created_at, u.updated_at,
                p.skills, p.interests, p.resume_url, p.github_url, p.linkedin_url, p.portfolio_url
         FROM users u
         LEFT JOIN profiles p ON u.user_id = p.user_id
         WHERE u.user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        sendError(res, 'User not found', undefined, 404);
        return;
      }

      const user = result.rows[0];
      sendSuccess(res, 'Profile retrieved successfully', {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        skills: user.skills || [],
        interests: user.interests || [],
        resumeUrl: user.resume_url,
        githubUrl: user.github_url,
        linkedinUrl: user.linkedin_url,
        portfolioUrl: user.portfolio_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      });
    } catch (error) {
      console.error('Get profile error:', error);
      sendError(res, 'Failed to retrieve profile', undefined, 500);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { 
        username, 
        first_name, 
        last_name, 
        skills, 
        interests, 
        github_url, 
        linkedin_url, 
        portfolio_url 
      } = req.body;

      const now = new Date();

      // Update user table
      if (username || first_name || last_name) {
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramIndex = 1;

        if (username) {
          updateFields.push(`username = $${paramIndex++}`);
          updateValues.push(username);
        }
        if (first_name) {
          updateFields.push(`first_name = $${paramIndex++}`);
          updateValues.push(first_name);
        }
        if (last_name) {
          updateFields.push(`last_name = $${paramIndex++}`);
          updateValues.push(last_name);
        }

        updateFields.push(`updated_at = $${paramIndex++}`);
        updateValues.push(now);
        updateValues.push(userId);

        await pgPool.query(
          `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex}`,
          updateValues
        );
      }

      // Update profile table
      if (skills || interests || github_url || linkedin_url || portfolio_url) {
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramIndex = 1;

        if (skills) {
          updateFields.push(`skills = $${paramIndex++}`);
          updateValues.push(skills);
        }
        if (interests) {
          updateFields.push(`interests = $${paramIndex++}`);
          updateValues.push(interests);
        }
        if (github_url !== undefined) {
          updateFields.push(`github_url = $${paramIndex++}`);
          updateValues.push(github_url);
        }
        if (linkedin_url !== undefined) {
          updateFields.push(`linkedin_url = $${paramIndex++}`);
          updateValues.push(linkedin_url);
        }
        if (portfolio_url !== undefined) {
          updateFields.push(`portfolio_url = $${paramIndex++}`);
          updateValues.push(portfolio_url);
        }

        updateFields.push(`updated_at = $${paramIndex++}`);
        updateValues.push(now);
        updateValues.push(userId);

        await pgPool.query(
          `UPDATE profiles SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex}`,
          updateValues
        );
      }

      sendSuccess(res, 'Profile updated successfully');
    } catch (error) {
      console.error('Update profile error:', error);
      sendError(res, 'Failed to update profile', undefined, 500);
    }
  }

  async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!validateUUID(userId)) {
        sendError(res, 'Invalid user ID format', undefined, 400);
        return;
      }

      const result = await pgPool.query(
        `SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, u.role, u.created_at,
                p.skills, p.interests, p.github_url, p.linkedin_url, p.portfolio_url
         FROM users u
         LEFT JOIN profiles p ON u.user_id = p.user_id
         WHERE u.user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        sendError(res, 'User not found', undefined, 404);
        return;
      }

      const user = result.rows[0];
      sendSuccess(res, 'User retrieved successfully', {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        skills: user.skills || [],
        interests: user.interests || [],
        githubUrl: user.github_url,
        linkedinUrl: user.linkedin_url,
        portfolioUrl: user.portfolio_url,
        createdAt: user.created_at
      });
    } catch (error) {
      console.error('Get user error:', error);
      sendError(res, 'Failed to retrieve user', undefined, 500);
    }
  }

  async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!validateUUID(userId)) {
        sendError(res, 'Invalid user ID format', undefined, 400);
        return;
      }

      const validRoles = ['participant', 'organizer', 'admin'];
      if (role && !validRoles.includes(role)) {
        sendError(res, 'Invalid role', undefined, 400);
        return;
      }

      const now = new Date();
      await pgPool.query(
        'UPDATE users SET role = $1, updated_at = $2 WHERE user_id = $3',
        [role, now, userId]
      );

      sendSuccess(res, 'User updated successfully');
    } catch (error) {
      console.error('Update user error:', error);
      sendError(res, 'Failed to update user', undefined, 500);
    }
  }

  async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const countResult = await pgPool.query('SELECT COUNT(*) FROM users');
      const total = parseInt(countResult.rows[0].count);

      const result = await pgPool.query(
        `SELECT u.user_id, u.username, u.email, u.first_name, u.last_name, u.role, u.created_at,
                p.skills, p.interests
         FROM users u
         LEFT JOIN profiles p ON u.user_id = p.user_id
         ORDER BY u.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const users = result.rows.map(user => ({
        userId: user.user_id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        skills: user.skills || [],
        interests: user.interests || [],
        createdAt: user.created_at
      }));

      const totalPages = Math.ceil(total / limit);

      sendSuccess(res, 'Users retrieved successfully', users);
    } catch (error) {
      console.error('Get all users error:', error);
      sendError(res, 'Failed to retrieve users', undefined, 500);
    }
  }

  async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!validateUUID(userId)) {
        sendError(res, 'Invalid user ID format', undefined, 400);
        return;
      }

      // Delete profile first (foreign key constraint)
      await pgPool.query('DELETE FROM profiles WHERE user_id = $1', [userId]);
      
      // Delete user
      const result = await pgPool.query('DELETE FROM users WHERE user_id = $1', [userId]);

      if (result.rowCount === 0) {
        sendError(res, 'User not found', undefined, 404);
        return;
      }

      sendSuccess(res, 'User deleted successfully');
    } catch (error) {
      console.error('Delete user error:', error);
      sendError(res, 'Failed to delete user', undefined, 500);
    }
  }
}

