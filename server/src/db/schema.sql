-- CamDetect Database Schema

-- Devices (anonymous tracking)
CREATE TABLE IF NOT EXISTS devices (
    device_id UUID PRIMARY KEY,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    reputation_score FLOAT DEFAULT 1.0,
    report_count INT DEFAULT 0,
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WiFi Networks
CREATE TABLE IF NOT EXISTS networks (
    id SERIAL PRIMARY KEY,
    ssid TEXT NOT NULL,
    bssid_hash TEXT,
    security_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ssid, bssid_hash)
);

CREATE INDEX IF NOT EXISTS idx_networks_ssid ON networks(ssid);
CREATE INDEX IF NOT EXISTS idx_networks_bssid ON networks(bssid_hash);

-- Network Locations (optional)
CREATE TABLE IF NOT EXISTS network_locations (
    id SERIAL PRIMARY KEY,
    network_id INT REFERENCES networks(id) ON DELETE CASCADE,
    geohash TEXT,
    city TEXT,
    country TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    reported_count INT DEFAULT 1,
    first_reported TIMESTAMPTZ DEFAULT NOW(),
    last_reported TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_locations_geohash ON network_locations(geohash);

-- Device Reports (cameras found)
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    network_id INT REFERENCES networks(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(device_id),
    devices_found JSONB,
    threat_level INT CHECK (threat_level BETWEEN 0 AND 5),
    security_type TEXT,
    location_geohash TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    validated BOOLEAN DEFAULT FALSE,
    source_ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_network ON reports(network_id);
CREATE INDEX IF NOT EXISTS idx_reports_submitted ON reports(submitted_at);

-- Network Alerts
CREATE TABLE IF NOT EXISTS network_alerts (
    id SERIAL PRIMARY KEY,
    network_id INT REFERENCES networks(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    severity INT CHECK (severity BETWEEN 1 AND 5),
    description TEXT,
    source_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_network_alerts_active ON network_alerts(network_id, is_active);
CREATE INDEX IF NOT EXISTS idx_network_alerts_type ON network_alerts(alert_type);

-- Rate Limiting
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    request_count INT DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Auth Tokens (for tracking)
CREATE TABLE IF NOT EXISTS auth_tokens (
    token UUID PRIMARY KEY,
    device_id UUID REFERENCES devices(device_id),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_device ON auth_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at);

-- Comments
COMMENT ON TABLE devices IS 'Anonymous device tracking for rate limiting and reputation';
COMMENT ON TABLE networks IS 'WiFi network information';
COMMENT ON TABLE reports IS 'User-submitted camera detections';
COMMENT ON TABLE network_alerts IS 'Active alerts for networks';
