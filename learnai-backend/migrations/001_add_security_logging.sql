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
