-- Create additional databases
CREATE DATABASE chatwoot;
CREATE DATABASE metabase;

-- Enable extensions in default database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";