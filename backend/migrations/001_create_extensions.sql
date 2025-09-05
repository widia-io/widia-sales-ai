-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types if needed
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'canceled', 'past_due', 'paused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'agent', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;