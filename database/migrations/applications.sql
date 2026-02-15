-- Create job applications table
CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    position_applied VARCHAR(255) NOT NULL,
    cover_letter TEXT,
    portfolio_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    resume_filename VARCHAR(255),
    resume_path VARCHAR(500),
    experience_years INTEGER,
    current_company VARCHAR(255),
    current_position VARCHAR(255),
    education_level VARCHAR(100),
    skills TEXT,
    availability VARCHAR(100),
    salary_expectation VARCHAR(100),
    work_location_preference VARCHAR(100),
    referral_source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_position ON applications(position_applied);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_applications_updated_at 
    BEFORE UPDATE ON applications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
