-- PersonalEA Database Initialization Script
-- This script sets up the basic database structure for PersonalEA

-- Create database if it doesn't exist (handled by Docker)
-- CREATE DATABASE IF NOT EXISTS personalea;

-- Use the personalea database
-- \c personalea;

-- Create basic tables for health checks and initial setup

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System health table for monitoring
CREATE TABLE IF NOT EXISTS system_health (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);

-- Configuration table for user settings
CREATE TABLE IF NOT EXISTS user_configurations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    config_key VARCHAR(255) NOT NULL,
    config_value JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, config_key)
);

-- Email accounts table
CREATE TABLE IF NOT EXISTS email_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    encrypted_credentials TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    priority INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active',
    target_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Calendar integrations table
CREATE TABLE IF NOT EXISTS calendar_integrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    calendar_id VARCHAR(255) NOT NULL,
    encrypted_credentials TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial health check record
INSERT INTO system_health (service_name, status, details) 
VALUES ('database', 'healthy', '{"message": "Database initialized successfully"}')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_configurations_user_id ON user_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_id ON calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_system_health_service_name ON system_health(service_name);

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO personalea;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO personalea;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'PersonalEA database initialized successfully at %', NOW();
END $$;