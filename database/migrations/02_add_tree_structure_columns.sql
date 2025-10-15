-- Migration: Add tree structure columns to test_cases table
-- Date: 2025-01-15
-- Version: 02
-- Status: DISABLED - Tree structure not implemented in current schema

-- DISABLED: This migration is not applied in the current database schema
-- The tree structure columns (parent_id, depth, sort_order) are not present
-- in the current test_cases table. This file is kept for future reference
-- but should not be executed.

/*
-- Original migration content (commented out):

-- Add tree structure columns to test_cases table
ALTER TABLE test_cases 
ADD COLUMN parent_id VARCHAR(50) NULL,
ADD COLUMN depth INTEGER DEFAULT 1,
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- parent_id references self (self-referencing foreign key)
ALTER TABLE test_cases 
ADD CONSTRAINT fk_test_cases_parent 
FOREIGN KEY (parent_id) REFERENCES test_cases(case_id) ON DELETE SET NULL;

-- Add indexes for tree structure query optimization
CREATE INDEX idx_test_cases_parent_id ON test_cases(parent_id);
CREATE INDEX idx_test_cases_sort_order ON test_cases(sort_order);

-- Initialize existing data
UPDATE test_cases SET 
    parent_id = NULL,  -- All existing items are root level
    depth = 1,         -- Level 1 (root)
    sort_order = CASE 
        WHEN case_id LIKE 'AUTH-%' THEN 100
        WHEN case_id LIKE 'MAP-%' THEN 200  
        WHEN case_id LIKE 'SEARCH-%' THEN 300
        WHEN case_id LIKE 'AI-%' THEN 400
        WHEN case_id LIKE 'COMM-%' THEN 500
        WHEN case_id LIKE 'MY-%' THEN 600
        ELSE 999
    END + CAST(SUBSTRING(case_id FROM '\d+$') AS INTEGER);

-- Add comments
COMMENT ON COLUMN test_cases.parent_id IS 'Parent test case ID (tree structure)';
COMMENT ON COLUMN test_cases.depth IS 'Depth in tree structure (1=root)';
COMMENT ON COLUMN test_cases.sort_order IS 'Sort order within same level';

*/