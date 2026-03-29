#!/bin/bash

# Database Migration Helper Script
# Run this script to execute the security logging migration

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}LearnAI Security Migration Helper${NC}"
echo -e "${YELLOW}========================================${NC}\n"

# Prompt for database information
read -p "Enter database name (default: learnai_db): " DB_NAME
DB_NAME=${DB_NAME:-learnai_db}

read -p "Enter database user (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -p "Enter database host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Enter database port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

# Show what we're about to do
echo -e "\n${YELLOW}Migration Details:${NC}"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo ""

# Backup database first
echo -e "${YELLOW}Step 1: Backing up database...${NC}"
BACKUP_FILE="backup_learnai_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" > "$BACKUP_FILE"
echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}\n"

# Run migration
echo -e "${YELLOW}Step 2: Running migration...${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" << 'EOF'
-- Video Access Logging & Security Alerts Tables
-- Created: March 27, 2026

-- Table 1: Video Access Log
-- Tracks every video access for audit trail and anomaly detection
CREATE TABLE IF NOT EXISTS video_access_log (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id INT,
  course_id INT,
  device_fingerprint VARCHAR(255),
  duration_watched INT DEFAULT 0,
  completion_percentage INT DEFAULT 0,
  user_agent TEXT,
  ip_address VARCHAR(45),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_video_access_log_user_id ON video_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_video_access_log_video_id ON video_access_log(video_id);
CREATE INDEX IF NOT EXISTS idx_video_access_log_timestamp ON video_access_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_video_access_log_user_timestamp ON video_access_log(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_video_access_log_device ON video_access_log(device_fingerprint);

-- Table 2: Security Alerts
-- Flags suspicious activities and anomalies
CREATE TABLE IF NOT EXISTS security_alert (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  details JSONB,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_at TIMESTAMP,
  reviewed_by INT REFERENCES users(id),
  admin_notes TEXT,
  action VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for alerts
CREATE INDEX IF NOT EXISTS idx_security_alert_user_id ON security_alert(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alert_timestamp ON security_alert(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_alert_reviewed ON security_alert(reviewed);
CREATE INDEX IF NOT EXISTS idx_security_alert_severity ON security_alert(severity);
CREATE INDEX IF NOT EXISTS idx_security_alert_activity_type ON security_alert(activity_type);

-- Add migration tracking comment
COMMENT ON TABLE video_access_log IS 'Video access audit trail - tracks user video viewing for security and analytics';
COMMENT ON TABLE security_alert IS 'Security alerts for suspicious activity - anomaly detection and admin review';
EOF

echo -e "${GREEN}✓ Migration completed successfully!${NC}\n"

# Verify tables were created
echo -e "${YELLOW}Step 3: Verifying tables...${NC}"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" << 'EOF'
\dt video_access_log security_alert
EOF

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Migration Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nNext steps:"
echo -e "1. Update server.js to register security routes"
echo -e "2. Restart your backend server"
echo -e "3. Test watermarking on a video"
echo -e "\nBackup saved as: $BACKUP_FILE"
