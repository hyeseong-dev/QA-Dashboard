-- Migration: Add password_hash column to users table for authentication
-- Date: 2025-01-15
-- Version: 01

-- Add password_hash column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add user detail columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing users with a default password hash (password: "password123")
-- $2a$12$LQv3c1yqBWVHxkd0LQ1Gv.6FuP3KfbkYUvW4z8ZdkRu3OqKKD3V4W is bcrypt hash for "password123"
UPDATE users 
SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LQ1Gv.6FuP3KfbkYUvW4z8ZdkRu3OqKKD3V4W'
WHERE password_hash IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password for authentication';
COMMENT ON COLUMN users.department IS 'User department/division';
COMMENT ON COLUMN users.position IS 'User job position/title';
COMMENT ON COLUMN users.phone IS 'User contact phone number';
COMMENT ON COLUMN users.profile_image IS 'User profile image URL or path';
COMMENT ON COLUMN users.last_login_at IS 'Last successful login timestamp';
COMMENT ON COLUMN users.created_at IS 'User account creation timestamp';
COMMENT ON COLUMN users.updated_at IS 'Last profile update timestamp';