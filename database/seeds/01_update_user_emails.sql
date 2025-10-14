-- Update existing users with proper email addresses and password hashes
UPDATE users SET 
  email = 'user-1@example.com',
  password_hash = '$2a$12$LQv3c1yqBWVHxkd0LQ1Gv.6FuP3KfbkYUvW4z8ZdkRu3OqKKD3V4W'
WHERE user_id = 'user-1';

UPDATE users SET 
  email = 'user-2@example.com',
  password_hash = '$2a$12$LQv3c1yqBWVHxkd0LQ1Gv.6FuP3KfbkYUvW4z8ZdkRu3OqKKD3V4W'
WHERE user_id = 'user-2';

UPDATE users SET 
  email = 'user-3@example.com',
  password_hash = '$2a$12$LQv3c1yqBWVHxkd0LQ1Gv.6FuP3KfbkYUvW4z8ZdkRu3OqKKD3V4W'
WHERE user_id = 'user-3';

UPDATE users SET 
  email = 'user-4@example.com',
  password_hash = '$2a$12$LQv3c1yqBWVHxkd0LQ1Gv.6FuP3KfbkYUvW4z8ZdkRu3OqKKD3V4W'
WHERE user_id = 'user-4';

UPDATE users SET 
  email = 'user-5@example.com',
  password_hash = '$2a$12$LQv3c1yqBWVHxkd0LQ1Gv.6FuP3KfbkYUvW4z8ZdkRu3OqKKD3V4W'
WHERE user_id = 'user-5';