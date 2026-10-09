-- Enable PostGIS extension for spatial queries (GPS lat/lng math)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types
CREATE TYPE user_role AS ENUM ('VICTIM', 'VOLUNTEER', 'COORDINATOR', 'ADMIN');
CREATE TYPE incident_status AS ENUM ('REPORTED', 'TRIAGED', 'DISPATCHED', 'RESOLVED', 'CLOSED');
CREATE TYPE incident_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(30),
    role user_role DEFAULT 'VICTIM',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Incidents Table (Supports spatial point coordinates)
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    raw_description TEXT NOT NULL,
    priority incident_priority DEFAULT 'MEDIUM',
    status incident_status DEFAULT 'REPORTED',
    
    -- PostGIS Geometry column for latitude & longitude (SRID 4326 = standard WGS 84 GPS)
    location GEOMETRY(Point, 4326) NOT NULL,
    
    -- Extracted AI metadata
    ai_extracted_needs JSONB DEFAULT '{}'::jsonb,
    ai_severity_score NUMERIC(3, 1) DEFAULT 0.0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial index to ensure millisecond queries on radius/proximity searches
CREATE INDEX idx_incidents_location ON incidents USING GIST (location);
CREATE INDEX idx_incidents_status ON incidents(status);
