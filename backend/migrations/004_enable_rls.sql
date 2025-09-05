-- Enable Row Level Security on tenant-scoped tables
-- This ensures complete data isolation between tenants

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy for users table: only see users from your tenant
CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Enable RLS on roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Policy for roles table
CREATE POLICY tenant_isolation_roles ON roles
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Enable RLS on audit_logs table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy for audit_logs table
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Note: refresh_tokens doesn't need RLS as it's accessed via user_id join

-- Create a special policy for super admins (optional - can bypass RLS)
-- This requires setting app.is_super_admin in the session
CREATE POLICY super_admin_bypass_users ON users
    USING (current_setting('app.is_super_admin', true)::boolean = true);

CREATE POLICY super_admin_bypass_roles ON roles
    USING (current_setting('app.is_super_admin', true)::boolean = true);

CREATE POLICY super_admin_bypass_audit_logs ON audit_logs
    USING (current_setting('app.is_super_admin', true)::boolean = true);

-- Create helper function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant', p_tenant_id::text, true);
END;
$$ LANGUAGE plpgsql;

-- Create helper function to set super admin context
CREATE OR REPLACE FUNCTION set_super_admin_context(p_is_super_admin BOOLEAN DEFAULT false)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.is_super_admin', p_is_super_admin::text, true);
END;
$$ LANGUAGE plpgsql;

-- Create function to verify RLS is working
CREATE OR REPLACE FUNCTION verify_rls_enabled()
RETURNS TABLE(table_name text, rls_enabled boolean) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::text,
        c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN ('users', 'roles', 'audit_logs');
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON POLICY tenant_isolation_users ON users IS 'Ensures users can only see/modify users from their own tenant';
COMMENT ON POLICY tenant_isolation_roles ON roles IS 'Ensures roles are isolated per tenant';
COMMENT ON POLICY tenant_isolation_audit_logs ON audit_logs IS 'Ensures audit logs are isolated per tenant';
COMMENT ON FUNCTION set_tenant_context IS 'Helper function to set the current tenant context for RLS';
COMMENT ON FUNCTION verify_rls_enabled IS 'Verify that RLS is properly enabled on tenant-scoped tables';