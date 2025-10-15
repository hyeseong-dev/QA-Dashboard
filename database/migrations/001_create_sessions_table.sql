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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Client information
  ip_address INET,
  user_agent TEXT,
  
  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Create indexes for performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_active_expires ON sessions(is_active, expires_at);
CREATE INDEX idx_sessions_user_active ON sessions(user_id, is_active, expires_at) WHERE is_active = true;

-- Create view for users with online status (REMOVED - SSE feature disabled)

-- Add comments for documentation
COMMENT ON TABLE sessions IS 'User session management table for tracking login/logout and online status';
COMMENT ON COLUMN sessions.session_id IS 'Unique session identifier';
COMMENT ON COLUMN sessions.user_id IS 'Reference to the user who owns this session';
COMMENT ON COLUMN sessions.token IS 'Authentication token for this session';
COMMENT ON COLUMN sessions.last_activity IS 'Last activity timestamp for auto-logout tracking';
COMMENT ON COLUMN sessions.expires_at IS 'Session expiration timestamp';
COMMENT ON COLUMN sessions.is_active IS 'Whether the session is currently active';
COMMENT ON COLUMN sessions.ip_address IS 'Client IP address for security tracking';
COMMENT ON COLUMN sessions.user_agent IS 'Client user agent string for device tracking';