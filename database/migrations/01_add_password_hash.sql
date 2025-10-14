-- Add password_hash column to users table for authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Update existing users with a default password hash (password: "password123")
-- $2a$12$LQv3c1yqBWVHxkd0LQ1Gv.6FuP3KfbkYUvW4z8ZdkRu3OqKKD3V4W is bcrypt hash for "password123"
UPDATE users 
SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LQ1Gv.6FuP3KfbkYUvW4z8ZdkRu3OqKKD3V4W'
WHERE password_hash IS NULL;