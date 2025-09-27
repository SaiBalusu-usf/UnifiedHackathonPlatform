import request from 'supertest'
import app from '../../services/auth/server'

describe('Authentication Integration Tests', () => {
  let authToken: string
  let refreshToken: string
  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser'
  }

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201)

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('registered successfully'),
        data: {
          user: {
            email: testUser.email,
            username: testUser.username,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            role: 'participant',
            isEmailVerified: false
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String)
          }
        }
      })

      authToken = response.body.data.tokens.accessToken
      refreshToken = response.body.data.tokens.refreshToken
    })

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email'
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('valid email')
          })
        ])
      })
    })

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'test2@example.com',
          password: 'weak'
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('8 characters')
          })
        ])
      })
    })

    it('should reject duplicate email registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'User already exists'
      })
    })

    it('should reject duplicate username registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'different@example.com'
        })
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Username taken'
      })
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            email: testUser.email,
            username: testUser.username,
            role: 'participant'
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String)
          }
        }
      })

      authToken = response.body.data.tokens.accessToken
      refreshToken = response.body.data.tokens.refreshToken
    })

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid credentials'
      })
    })

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid credentials'
      })
    })

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: testUser.password
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Validation failed'
      })
    })
  })

  describe('GET /api/auth/profile', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: testUser.email,
            username: testUser.username,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            role: 'participant',
            isEmailVerified: false,
            twoFactorEnabled: false
          }
        }
      })
    })

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Unauthorized'
      })
    })

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid token'
      })
    })
  })

  describe('PUT /api/auth/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        username: 'updateduser'
      }

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            firstName: updateData.firstName,
            lastName: updateData.lastName,
            username: updateData.username
          }
        }
      })
    })

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({ firstName: 'Test' })
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Unauthorized'
      })
    })

    it('should validate profile update data', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: '', // Invalid: empty string
          lastName: 'A'.repeat(51) // Invalid: too long
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Validation failed'
      })
    })
  })

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh tokens successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String)
          }
        }
      })

      // Update tokens for subsequent tests
      authToken = response.body.data.tokens.accessToken
      refreshToken = response.body.data.tokens.refreshToken
    })

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid refresh token'
      })
    })

    it('should reject request without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Refresh token required'
      })
    })
  })

  describe('PUT /api/auth/change-password', () => {
    it('should change password successfully', async () => {
      const newPassword = 'NewPassword123!'
      
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Password changed successfully'
      })

      // Update password for subsequent tests
      testUser.password = newPassword
    })

    it('should reject with incorrect current password', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'NewPassword123!'
        })
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid password'
      })
    })

    it('should reject without authentication', async () => {
      const response = await request(app)
        .put('/api/auth/change-password')
        .send({
          currentPassword: testUser.password,
          newPassword: 'NewPassword123!'
        })
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Unauthorized'
      })
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: 'Logout successful'
      })
    })

    it('should invalidate tokens after logout', async () => {
      // Try to use the old token
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid token'
      })
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits on login attempts', async () => {
      // Make multiple failed login attempts
      const promises = Array(6).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
      )

      const responses = await Promise.all(promises)
      
      // The last request should be rate limited
      const lastResponse = responses[responses.length - 1]
      expect(lastResponse.status).toBe(429)
      expect(lastResponse.body).toMatchObject({
        error: 'Too many requests'
      })
    }, 10000)
  })

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.headers).toMatchObject({
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block'
      })

      expect(response.headers['x-powered-by']).toBeUndefined()
    })
  })

  describe('OAuth Endpoints', () => {
    it('should redirect to Google OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/google')
        .expect(302)

      expect(response.headers.location).toMatch(/accounts\.google\.com/)
    })

    it('should redirect to GitHub OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/github')
        .expect(302)

      expect(response.headers.location).toMatch(/github\.com/)
    })

    it('should redirect to LinkedIn OAuth', async () => {
      const response = await request(app)
        .get('/api/auth/linkedin')
        .expect(302)

      expect(response.headers.location).toMatch(/linkedin\.com/)
    })
  })
})

