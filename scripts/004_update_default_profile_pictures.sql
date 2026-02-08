-- Update all users without a profile picture to use the default avatar
UPDATE users 
SET profile_picture_url = '/default-avatar.png'
WHERE profile_picture_url IS NULL OR profile_picture_url = '';
