-- Migration: Add error tracking and fix status columns to test_cases table
-- This adds support for error categorization and fix tracking

-- Add columns for error tracking and fix status
ALTER TABLE test_cases 
ADD COLUMN IF NOT EXISTS error_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS fix_checked BOOLEAN DEFAULT false;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_cases_error_type ON test_cases(error_type);

-- Update migration history
INSERT INTO migration_history (migration_name, success) 
VALUES ('006_add_error_tracking_columns', true)
ON CONFLICT (migration_name) DO UPDATE SET
    executed_at = CURRENT_TIMESTAMP,
    success = true;