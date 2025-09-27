# Unified Hackathon Platform Platform API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [User Management API](#user-management-api)
4. [Team Formation API](#team-formation-api)
5. [Resume Analysis API](#resume-analysis-api)
6. [Tracking API](#tracking-api)
7. [AI Agent API](#ai-agent-api)
8. [WebSocket Events](#websocket-events)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)

## Overview

The Unified Hackathon Platform Platform provides a comprehensive set of RESTful APIs for managing hackathon team formation, user profiles, resume analysis, and real-time tracking. The platform follows microservices architecture with dedicated services for different functionalities.

### Base URLs
- **Authentication Service**: `http://localhost:3001/api/auth`
- **User Management Service**: `http://localhost:3002/api/users`
- **Team Formation Service**: `http://localhost:3003/api/teams`
- **Resume Analysis Service**: `http://localhost:3004/api/resumes`
- **Tracking Service**: `http://localhost:3005/api/tracking`
- **WebSocket Server**: `ws://localhost:3000`

### API Versioning
All APIs use version 1.0 and follow RESTful conventions. Future versions will be supported through URL versioning (e.g., `/api/v2/`).

## Authentication

### JWT Token Authentication
The platform uses JWT (JSON Web Tokens) for authentication with the following token types:
- **Access Token**: Short-lived (15 minutes) for API access
- **Refresh Token**: Long-lived (7 days) for token renewal

### OAuth Integration
Supported OAuth providers:
- Google OAuth 2.0
- GitHub OAuth
- LinkedIn OAuth

### Authentication Headers
```
Authorization: Bearer <access_token>
```

## User Management API

### Register User
**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "role": "participant",
      "isEmailVerified": false
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    }
  }
}
```

### Login User
**POST** `/api/auth/login`

Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "role": "participant",
      "isEmailVerified": true,
      "twoFactorEnabled": false
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    }
  }
}
```

### Get User Profile
**GET** `/api/auth/profile`

Retrieve authenticated user's profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "role": "participant",
      "isEmailVerified": true,
      "twoFactorEnabled": false,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "lastLoginAt": "2023-01-01T12:00:00.000Z",
      "oauthProviders": ["google", "github"]
    }
  }
}
```

### Update User Profile
**PUT** `/api/auth/profile`

Update user profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "username": "janesmith"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "username": "janesmith",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "participant"
    }
  }
}
```

### Refresh Token
**POST** `/api/auth/refresh-token`

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "new-jwt-access-token",
      "refreshToken": "new-jwt-refresh-token"
    }
  }
}
```

### Logout
**POST** `/api/auth/logout`

Logout user and invalidate tokens.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Change Password
**PUT** `/api/auth/change-password`

Change user password.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### OAuth Authentication

#### Google OAuth
**GET** `/api/auth/google`

Redirects to Google OAuth consent screen.

#### GitHub OAuth
**GET** `/api/auth/github`

Redirects to GitHub OAuth authorization.

#### LinkedIn OAuth
**GET** `/api/auth/linkedin`

Redirects to LinkedIn OAuth authorization.

## Team Formation API

### Create Team
**POST** `/api/teams`

Create a new team for a hackathon.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Awesome Team",
  "description": "Building the next big thing",
  "hackathonId": "hackathon-uuid",
  "maxMembers": 4,
  "requiredSkills": ["JavaScript", "Python", "UI/UX Design"],
  "isPublic": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Team created successfully",
  "data": {
    "team": {
      "id": "team-uuid",
      "name": "Awesome Team",
      "description": "Building the next big thing",
      "hackathonId": "hackathon-uuid",
      "leaderId": "user-uuid",
      "maxMembers": 4,
      "currentMembers": 1,
      "requiredSkills": ["JavaScript", "Python", "UI/UX Design"],
      "isPublic": true,
      "status": "recruiting",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "members": [
        {
          "userId": "user-uuid",
          "role": "leader",
          "joinedAt": "2023-01-01T00:00:00.000Z"
        }
      ]
    }
  }
}
```

### Get Team Details
**GET** `/api/teams/:teamId`

Retrieve detailed information about a specific team.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "team": {
      "id": "team-uuid",
      "name": "Awesome Team",
      "description": "Building the next big thing",
      "hackathonId": "hackathon-uuid",
      "leaderId": "user-uuid",
      "maxMembers": 4,
      "currentMembers": 3,
      "requiredSkills": ["JavaScript", "Python", "UI/UX Design"],
      "isPublic": true,
      "status": "active",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "members": [
        {
          "userId": "user-uuid-1",
          "username": "leader",
          "firstName": "John",
          "lastName": "Doe",
          "role": "leader",
          "skills": ["JavaScript", "React"],
          "joinedAt": "2023-01-01T00:00:00.000Z"
        },
        {
          "userId": "user-uuid-2",
          "username": "developer",
          "firstName": "Jane",
          "lastName": "Smith",
          "role": "member",
          "skills": ["Python", "Django"],
          "joinedAt": "2023-01-01T01:00:00.000Z"
        }
      ],
      "invitations": [
        {
          "email": "designer@example.com",
          "status": "pending",
          "sentAt": "2023-01-01T02:00:00.000Z"
        }
      ]
    }
  }
}
```

### Join Team
**POST** `/api/teams/:teamId/join`

Request to join a team.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully joined the team",
  "data": {
    "membership": {
      "teamId": "team-uuid",
      "userId": "user-uuid",
      "role": "member",
      "joinedAt": "2023-01-01T00:00:00.000Z"
    }
  }
}
```

### Invite Team Member
**POST** `/api/teams/:teamId/invite`

Invite a user to join the team.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "message": "We'd love to have you on our team!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "data": {
    "invitation": {
      "id": "invitation-uuid",
      "teamId": "team-uuid",
      "email": "newmember@example.com",
      "invitedBy": "user-uuid",
      "status": "pending",
      "sentAt": "2023-01-01T00:00:00.000Z",
      "expiresAt": "2023-01-08T00:00:00.000Z"
    }
  }
}
```

### Get Team Suggestions
**GET** `/api/teams/suggestions`

Get AI-powered team suggestions for the user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `hackathonId` (optional): Filter by specific hackathon
- `limit` (optional): Number of suggestions (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "team": {
          "id": "team-uuid",
          "name": "Data Science Team",
          "description": "Working on ML solutions",
          "requiredSkills": ["Python", "Machine Learning"],
          "currentMembers": 2,
          "maxMembers": 4
        },
        "compatibility": {
          "score": 85,
          "reasons": [
            "Your Python skills match their requirements",
            "Complementary experience levels",
            "Similar project interests"
          ],
          "skillMatch": ["Python", "Data Analysis"],
          "missingSkills": ["Machine Learning"]
        }
      }
    ]
  }
}
```

## Resume Analysis API

### Upload Resume
**POST** `/api/resumes/upload`

Upload and analyze a resume file.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
- `file`: Resume file (PDF, DOC, DOCX, or TXT)
- `visibility` (optional): "public" or "private" (default: "private")

**Response:**
```json
{
  "success": true,
  "message": "Resume uploaded and queued for analysis",
  "data": {
    "resume": {
      "id": "resume-uuid",
      "userId": "user-uuid",
      "filename": "john_doe_resume.pdf",
      "mimeType": "application/pdf",
      "size": 245760,
      "status": "processing",
      "visibility": "private",
      "uploadedAt": "2023-01-01T00:00:00.000Z"
    }
  }
}
```

### Get Resume Analysis
**GET** `/api/resumes/:resumeId`

Retrieve resume analysis results.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "resume": {
      "id": "resume-uuid",
      "userId": "user-uuid",
      "filename": "john_doe_resume.pdf",
      "status": "completed",
      "visibility": "private",
      "uploadedAt": "2023-01-01T00:00:00.000Z",
      "processedAt": "2023-01-01T00:05:00.000Z",
      "analysis": {
        "skills": [
          {
            "name": "JavaScript",
            "category": "Programming Language",
            "confidence": 0.95,
            "yearsOfExperience": 5
          },
          {
            "name": "React",
            "category": "Frontend Framework",
            "confidence": 0.90,
            "yearsOfExperience": 3
          }
        ],
        "experience": [
          {
            "title": "Senior Software Engineer",
            "company": "Tech Corp",
            "duration": "2020-2023",
            "description": "Led development of web applications",
            "skills": ["JavaScript", "React", "Node.js"]
          }
        ],
        "education": [
          {
            "degree": "BS Computer Science",
            "institution": "University of Technology",
            "year": "2018",
            "gpa": "3.8"
          }
        ],
        "summary": "Experienced software engineer with 5+ years in web development",
        "strengths": ["Full-stack development", "Team leadership", "Problem solving"],
        "recommendations": [
          "Consider highlighting cloud computing experience",
          "Add more quantifiable achievements"
        ]
      }
    }
  }
}
```

### Get User Resumes
**GET** `/api/resumes`

Get all resumes for the authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "resumes": [
      {
        "id": "resume-uuid-1",
        "filename": "resume_v1.pdf",
        "status": "completed",
        "uploadedAt": "2023-01-01T00:00:00.000Z",
        "skillsCount": 12,
        "experienceYears": 5
      },
      {
        "id": "resume-uuid-2",
        "filename": "resume_v2.pdf",
        "status": "processing",
        "uploadedAt": "2023-01-02T00:00:00.000Z",
        "skillsCount": null,
        "experienceYears": null
      }
    ]
  }
}
```

## Tracking API

### Start Session
**POST** `/api/tracking/sessions`

Start a new work session.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "hackathonId": "hackathon-uuid",
  "teamId": "team-uuid",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session started successfully",
  "data": {
    "session": {
      "id": "session-uuid",
      "userId": "user-uuid",
      "hackathonId": "hackathon-uuid",
      "teamId": "team-uuid",
      "status": "active",
      "startTime": "2023-01-01T09:00:00.000Z",
      "location": {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "accuracy": 10,
        "timestamp": "2023-01-01T09:00:00.000Z"
      }
    }
  }
}
```

### Update Session
**PUT** `/api/tracking/sessions/:sessionId`

Update an active session.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "status": "active",
  "currentTask": "Working on frontend components",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session updated successfully",
  "data": {
    "session": {
      "id": "session-uuid",
      "userId": "user-uuid",
      "status": "active",
      "currentTask": "Working on frontend components",
      "lastActivity": "2023-01-01T10:30:00.000Z",
      "totalWorkTime": 5400,
      "location": {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "accuracy": 5,
        "timestamp": "2023-01-01T10:30:00.000Z"
      }
    }
  }
}
```

### Get Session Analytics
**GET** `/api/tracking/analytics`

Get user's session analytics.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `hackathonId` (optional): Filter by hackathon
- `startDate` (optional): Start date for analytics
- `endDate` (optional): End date for analytics

**Response:**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "totalSessions": 15,
      "totalWorkTime": 86400,
      "averageSessionLength": 5760,
      "productivityScore": 85,
      "dailyStats": [
        {
          "date": "2023-01-01",
          "sessions": 3,
          "workTime": 21600,
          "productivity": 90
        }
      ],
      "skillProgress": [
        {
          "skill": "JavaScript",
          "hoursWorked": 40,
          "improvement": 15
        }
      ]
    }
  }
}
```

## AI Agent API

### Get Agent Status
**GET** `/api/agents/status`

Get status of all AI agents.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "profile-parsing-agent-1",
        "type": "ProfileParsingAgent",
        "status": "running",
        "healthy": true,
        "uptime": 86400,
        "tasksProcessed": 150,
        "successRate": 98.5,
        "averageResponseTime": 2.3,
        "lastActivity": "2023-01-01T10:30:00.000Z"
      },
      {
        "id": "skill-matching-agent-1",
        "type": "SkillMatchingAgent",
        "status": "running",
        "healthy": true,
        "uptime": 86400,
        "tasksProcessed": 75,
        "successRate": 100,
        "averageResponseTime": 1.8,
        "lastActivity": "2023-01-01T10:25:00.000Z"
      }
    ],
    "systemStats": {
      "totalAgents": 3,
      "runningAgents": 3,
      "healthyAgents": 3,
      "totalTasksProcessed": 300,
      "averageResponseTime": 2.1
    }
  }
}
```

### Control Agent
**POST** `/api/agents/:agentId/control`

Start, stop, or restart an AI agent.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "action": "restart"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent restarted successfully",
  "data": {
    "agent": {
      "id": "profile-parsing-agent-1",
      "status": "running",
      "lastRestart": "2023-01-01T10:30:00.000Z"
    }
  }
}
```

## WebSocket Events

### Connection
Connect to WebSocket server with authentication:

```javascript
const socket = io('ws://localhost:3000', {
  auth: {
    token: 'jwt-access-token'
  }
})
```

### Events

#### Join Hackathon Room
```javascript
socket.emit('join-hackathon', 'hackathon-uuid')
```

#### Location Update
```javascript
// Send location update
socket.emit('location-update', {
  hackathonId: 'hackathon-uuid',
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    timestamp: new Date().toISOString()
  }
})

// Receive location updates
socket.on('location-update', (data) => {
  console.log('User location update:', data)
})
```

#### Team Notifications
```javascript
// Receive team invitations
socket.on('team-invitation', (data) => {
  console.log('New team invitation:', data)
})

// Receive team updates
socket.on('team-update', (data) => {
  console.log('Team update:', data)
})
```

#### Agent Notifications
```javascript
// Receive resume analysis completion
socket.on('resume-analyzed', (data) => {
  console.log('Resume analysis complete:', data)
})

// Receive skill matching results
socket.on('skill-matches-found', (data) => {
  console.log('New skill matches:', data)
})
```

## Error Handling

### Error Response Format
All API errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message",
  "timestamp": "2023-01-01T10:30:00.000Z",
  "path": "/api/endpoint",
  "method": "POST",
  "details": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "value": "invalid-email"
    }
  ]
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (validation failed)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Common Error Types
- `Validation Error` - Input validation failed
- `Authentication Error` - Invalid or missing authentication
- `Authorization Error` - Insufficient permissions
- `Not Found` - Resource not found
- `Conflict` - Resource already exists
- `Rate Limit Exceeded` - Too many requests

## Rate Limiting

### Rate Limits by Endpoint Type

#### Authentication Endpoints
- **Login/Register**: 5 requests per 15 minutes per IP
- **Password Reset**: 3 requests per hour per IP
- **Token Refresh**: 10 requests per minute per user

#### General API Endpoints
- **Standard APIs**: 100 requests per 15 minutes per user
- **File Upload**: 10 uploads per hour per user
- **Search/Matching**: 50 requests per 15 minutes per user

#### WebSocket Connections
- **Connection Limit**: 5 concurrent connections per user
- **Message Rate**: 100 messages per minute per connection

### Rate Limit Headers
Rate limit information is included in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 900
}
```

---

*This documentation is automatically generated and updated. For the latest version, please refer to the API documentation at `/docs` endpoint.*

