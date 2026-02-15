-- Message System Schema with Admin Approval Workflow
-- This schema handles replies, SWIFT copies, and status management
-- All features require admin approval before users can access them

-- User Permissions Table - Admin controls who can see replies and download SWIFT copies
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    can_view_replies BOOLEAN DEFAULT false, -- Admin must approve this
    can_download_swift_copies BOOLEAN DEFAULT false, -- Admin must approve this
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Message Replies Table - Admin uploads text replies from receiving banks
CREATE TABLE IF NOT EXISTS message_replies (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    reply_type VARCHAR(50) DEFAULT 'text', -- Always 'text' for text replies
    content TEXT NOT NULL, -- Text content of the reply from receiving bank
    status VARCHAR(50) DEFAULT 'received', -- Status: received, processed, acknowledged
    file_path VARCHAR(500), -- Optional file attachment
    original_filename VARCHAR(255), -- Original filename if attachment
    created_by UUID NOT NULL REFERENCES users(id), -- Admin who uploaded the reply
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SWIFT Copies Table - Admin uploads PDF copies of SWIFT messages
CREATE TABLE IF NOT EXISTS swift_copies (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    copy_type VARCHAR(50) DEFAULT 'original', -- Type: original, acknowledgment, confirmation
    file_path VARCHAR(500) NOT NULL, -- Path to uploaded PDF file
    original_filename VARCHAR(255) NOT NULL, -- Original PDF filename
    file_size INTEGER, -- File size in bytes
    uploaded_by UUID NOT NULL REFERENCES users(id), -- Admin who uploaded the PDF
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message Status Trail Table - Admin manually updates message status with notes
CREATE TABLE IF NOT EXISTS message_status_trail (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- Current status (handwritten by admin)
    notes TEXT, -- Admin notes about the status change
    changed_by UUID NOT NULL REFERENCES users(id), -- Admin who changed status
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_replies_message_id ON message_replies(message_id);
CREATE INDEX IF NOT EXISTS idx_message_replies_created_at ON message_replies(created_at);
CREATE INDEX IF NOT EXISTS idx_swift_copies_message_id ON swift_copies(message_id);
CREATE INDEX IF NOT EXISTS idx_swift_copies_uploaded_at ON swift_copies(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_message_status_trail_message_id ON message_status_trail(message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_trail_created_at ON message_status_trail(created_at);

-- Create uploads directory for SWIFT copies (PDF files)
-- This should be created in the file system: mkdir -p uploads/swift-copies

-- Default permissions for existing users (admin must manually approve)
INSERT INTO user_permissions (user_id, can_view_replies, can_download_swift_copies)
SELECT id, false, false FROM users 
WHERE id NOT IN (SELECT user_id FROM user_permissions);

-- Comments explaining the workflow:
-- 1. User sends message (existing functionality)
-- 2. Admin receives reply from receiving bank
-- 3. Admin uploads text reply via admin panel
-- 4. Admin uploads PDF SWIFT copy via admin panel
-- 5. Admin updates message status manually with notes
-- 6. Admin approves user permissions to view replies/download copies
-- 7. User can then see replies and download SWIFT copies

SELECT 'Message System Schema with Admin Approval Workflow Created Successfully!' as status;
