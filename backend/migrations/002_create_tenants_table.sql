-- Create tenants table (no RLS - global table)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(63) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    settings JSONB DEFAULT '{}',
    subscription_status subscription_status DEFAULT 'trial',
    subscription_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_domain ON tenants(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_tenants_deleted_at ON tenants(deleted_at);
CREATE INDEX idx_tenants_subscription_status ON tenants(subscription_status);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE
    ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE tenants IS 'Main tenants table for multi-tenancy';
COMMENT ON COLUMN tenants.slug IS 'Unique identifier used in subdomains';
COMMENT ON COLUMN tenants.settings IS 'JSON settings for tenant customization';
COMMENT ON COLUMN tenants.subscription_status IS 'Current subscription status';
COMMENT ON COLUMN tenants.deleted_at IS 'Soft delete timestamp';