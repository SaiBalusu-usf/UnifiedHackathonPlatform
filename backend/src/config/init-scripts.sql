-- Unified Hackathon Platform Platform Database Initialization Script
-- This script creates the initial database schema and seed data

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS unified_hackathon_dev;
CREATE DATABASE IF NOT EXISTS unified_hackathon_test;
CREATE DATABASE IF NOT EXISTS unified_hackathon_prod;

-- Use the development database
\c unified_hackathon_dev;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'participant',
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    oauth_providers JSONB DEFAULT '[]',
    profile_data JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create hackathons table
CREATE TABLE IF NOT EXISTS hackathons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    registration_start TIMESTAMP NOT NULL,
    registration_end TIMESTAMP NOT NULL,
    location VARCHAR(255),
    max_participants INTEGER,
    max_team_size INTEGER DEFAULT 4,
    min_team_size INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'upcoming',
    organizer_id UUID REFERENCES users(id),
    rules JSONB DEFAULT '{}',
    prizes JSONB DEFAULT '[]',
    sponsors JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
    leader_id UUID REFERENCES users(id),
    max_members INTEGER DEFAULT 4,
    current_members INTEGER DEFAULT 1,
    required_skills JSONB DEFAULT '[]',
    is_public BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'recruiting',
    project_idea TEXT,
    github_repo VARCHAR(255),
    demo_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    skills_contributed JSONB DEFAULT '[]',
    UNIQUE(team_id, user_id)
);

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    inviter_id UUID REFERENCES users(id),
    email VARCHAR(255) NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);

-- Create hackathon_registrations table
CREATE TABLE IF NOT EXISTS hackathon_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    registration_data JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'registered',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hackathon_id, user_id)
);

-- Create user_skills table
CREATE TABLE IF NOT EXISTS user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50),
    proficiency_level INTEGER CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
    years_of_experience INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_name)
);

-- Create user_sessions table for tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    hackathon_id UUID REFERENCES hackathons(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- in seconds
    status VARCHAR(50) DEFAULT 'active',
    location_data JSONB,
    activity_data JSONB DEFAULT '{}',
    goals JSONB DEFAULT '[]',
    achievements JSONB DEFAULT '[]'
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    channel VARCHAR(50) DEFAULT 'websocket',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_hackathons_status ON hackathons(status);
CREATE INDEX IF NOT EXISTS idx_hackathons_start_date ON hackathons(start_date);
CREATE INDEX IF NOT EXISTS idx_hackathons_organizer ON hackathons(organizer_id);

CREATE INDEX IF NOT EXISTS idx_teams_hackathon ON teams(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader ON teams(leader_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_hackathon ON hackathon_registrations(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_user ON hackathon_registrations(user_id);

CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON user_skills(skill_name);
CREATE INDEX IF NOT EXISTS idx_user_skills_category ON user_skills(skill_category);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_hackathon ON user_sessions(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hackathons_updated_at BEFORE UPDATE ON hackathons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert seed data
INSERT INTO users (email, username, password_hash, first_name, last_name, role, is_email_verified) VALUES
('admin@unified_hackathon.com', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvAu.', 'Admin', 'User', 'admin', TRUE),
('organizer@unified_hackathon.com', 'organizer', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvAu.', 'Event', 'Organizer', 'organizer', TRUE),
('mentor@unified_hackathon.com', 'mentor', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvAu.', 'Tech', 'Mentor', 'mentor', TRUE),
('participant1@unified_hackathon.com', 'participant1', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvAu.', 'John', 'Doe', 'participant', TRUE),
('participant2@unified_hackathon.com', 'participant2', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PmvAu.', 'Jane', 'Smith', 'participant', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Insert sample hackathon
INSERT INTO hackathons (name, description, start_date, end_date, registration_start, registration_end, location, max_participants, organizer_id) VALUES
('Unified Hackathon Platform Demo 2024', 'A demo hackathon for testing the Unified Hackathon Platform platform', 
 CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP + INTERVAL '9 days',
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '6 days',
 'San Francisco, CA', 100, 
 (SELECT id FROM users WHERE email = 'organizer@unified_hackathon.com'))
ON CONFLICT DO NOTHING;

-- Insert sample skills
INSERT INTO user_skills (user_id, skill_name, skill_category, proficiency_level, years_of_experience) VALUES
((SELECT id FROM users WHERE email = 'participant1@unified_hackathon.com'), 'JavaScript', 'Programming Language', 4, 3),
((SELECT id FROM users WHERE email = 'participant1@unified_hackathon.com'), 'React', 'Frontend Framework', 4, 2),
((SELECT id FROM users WHERE email = 'participant1@unified_hackathon.com'), 'Node.js', 'Backend Framework', 3, 2),
((SELECT id FROM users WHERE email = 'participant2@unified_hackathon.com'), 'Python', 'Programming Language', 5, 4),
((SELECT id FROM users WHERE email = 'participant2@unified_hackathon.com'), 'Django', 'Backend Framework', 4, 3),
((SELECT id FROM users WHERE email = 'participant2@unified_hackathon.com'), 'UI/UX Design', 'Design', 3, 2)
ON CONFLICT (user_id, skill_name) DO NOTHING;

-- Create views for common queries
CREATE OR REPLACE VIEW team_details AS
SELECT 
    t.*,
    u.username as leader_username,
    u.first_name as leader_first_name,
    u.last_name as leader_last_name,
    h.name as hackathon_name,
    h.start_date as hackathon_start,
    h.end_date as hackathon_end
FROM teams t
JOIN users u ON t.leader_id = u.id
JOIN hackathons h ON t.hackathon_id = h.id;

CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    u.*,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'skill_name', us.skill_name,
                'category', us.skill_category,
                'proficiency', us.proficiency_level,
                'experience', us.years_of_experience
            )
        ) FILTER (WHERE us.skill_name IS NOT NULL), 
        '[]'::json
    ) as skills
FROM users u
LEFT JOIN user_skills us ON u.id = us.user_id
GROUP BY u.id;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO unified_hackathon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO unified_hackathon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO unified_hackathon;

-- Print completion message
SELECT 'Unified Hackathon Platform database initialization completed successfully!' as message;

