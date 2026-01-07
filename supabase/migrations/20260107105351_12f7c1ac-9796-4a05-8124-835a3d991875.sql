-- Update admin user password using auth.users directly
-- Note: This sets the password hash for 'Admin@123!'
UPDATE auth.users 
SET encrypted_password = crypt('Admin@123!', gen_salt('bf')),
    updated_at = now()
WHERE id = '3defcfb5-8c9f-421d-9c46-50f95fb85a82';