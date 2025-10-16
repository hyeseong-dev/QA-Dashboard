-- Migration: Add tree structure columns to test_cases table
-- This adds support for hierarchical test case organization

-- Add columns for tree structure
ALTER TABLE test_cases 
ADD COLUMN parent_id VARCHAR(50),
ADD COLUMN depth INTEGER DEFAULT 1,
ADD COLUMN sort_order INTEGER DEFAULT 1;

-- Add foreign key constraint for parent_id
ALTER TABLE test_cases 
ADD CONSTRAINT fk_test_cases_parent 
FOREIGN KEY (parent_id) REFERENCES test_cases(case_id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX idx_test_cases_parent_id ON test_cases(parent_id);
CREATE INDEX idx_test_cases_sort_order ON test_cases(sort_order);

-- Update existing records to have proper sort_order values
UPDATE test_cases 
SET sort_order = ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY case_id)
WHERE sort_order IS NULL OR sort_order = 1;