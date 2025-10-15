-- Migration: Create sessions table for user session management
-- Date: 2025-01-15
-- Version: 001

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS sessions CASCADE;

-- Create sessions table
CREATE TABLE sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  
  -- Time information
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Create indexes for performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_active ON sessions(is_active, expires_at);
CREATE INDEX idx_sessions_last_activity ON sessions(last_activity);

-- Create view for users with online status
CREATE OR REPLACE VIEW users_online_status AS
SELECT 
  u.*,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM sessions s 
      WHERE s.user_id = u.user_id 
        AND s.is_active = true 
        AND s.expires_at > CURRENT_TIMESTAMP
        AND s.last_activity > CURRENT_TIMESTAMP - INTERVAL '30 minutes'
    ) THEN true 
    ELSE false 
  END as is_online,
  (
    SELECT MAX(s.last_activity) 
    FROM sessions s 
    WHERE s.user_id = u.user_id 
      AND s.is_active = true
  ) as last_activity_from_session
FROM users u;

-- Add comment for documentation
COMMENT ON TABLE sessions IS 'User session management table for tracking login/logout and online status';
COMMENT ON COLUMN sessions.session_id IS 'Unique session identifier';
COMMENT ON COLUMN sessions.user_id IS 'Reference to the user who owns this session';
COMMENT ON COLUMN sessions.token IS 'Authentication token for this session';
COMMENT ON COLUMN sessions.last_activity IS 'Last activity timestamp for auto-logout tracking';
COMMENT ON COLUMN sessions.expires_at IS 'Session expiration timestamp';
COMMENT ON COLUMN sessions.is_active IS 'Whether the session is currently active';