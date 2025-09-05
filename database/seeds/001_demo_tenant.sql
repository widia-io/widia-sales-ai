-- Seed data for demo/development environment
-- Creates a demo tenant with sample users and roles

-- Create demo tenant
INSERT INTO tenants (id, slug, name, domain, settings, subscription_status, subscription_ends_at)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'demo',
    'Demo Company',
    'demo.localhost',
    '{"theme": "default", "language": "pt-BR", "timezone": "America/Sao_Paulo"}',
    'trial',
    NOW() + INTERVAL '14 days'
) ON CONFLICT (slug) DO NOTHING;

-- Create another sample tenant
INSERT INTO tenants (id, slug, name, domain, settings, subscription_status)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    'acme',
    'ACME Corporation',
    'acme.localhost',
    '{"theme": "default", "language": "en-US", "timezone": "America/New_York"}',
    'active'
) ON CONFLICT (slug) DO NOTHING;

-- Temporarily disable RLS for seeding (requires superuser)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Create demo users for demo tenant
-- Password for all users: Demo@123 (bcrypt hash)
INSERT INTO users (id, tenant_id, email, password_hash, name, role, is_active)
VALUES 
    (
        'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid,
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
        'admin@demo.com',
        '$2a$10$YpVrLJ1VVkR6JmDhSvCLGutmrWY6uF6SUpOJnxW6qjKnMzI0YWJMm', -- Demo@123
        'Admin User',
        'admin',
        true
    ),
    (
        'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'::uuid,
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
        'agent@demo.com',
        '$2a$10$YpVrLJ1VVkR6JmDhSvCLGutmrWY6uF6SUpOJnxW6qjKnMzI0YWJMm', -- Demo@123
        'Sales Agent',
        'agent',
        true
    ),
    (
        'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15'::uuid,
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
        'viewer@demo.com',
        '$2a$10$YpVrLJ1VVkR6JmDhSvCLGutmrWY6uF6SUpOJnxW6qjKnMzI0YWJMm', -- Demo@123
        'Viewer User',
        'viewer',
        true
    )
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Create custom roles for demo tenant
INSERT INTO roles (id, tenant_id, name, permissions)
VALUES
    (
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16'::uuid,
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
        'Administrator',
        '["users.create", "users.read", "users.update", "users.delete", "settings.manage", "billing.manage", "reports.view"]'
    ),
    (
        'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a17'::uuid,
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
        'Sales Agent',
        '["leads.create", "leads.read", "leads.update", "conversations.manage", "calendar.manage", "reports.view"]'
    ),
    (
        'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380a18'::uuid,
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
        'Viewer',
        '["leads.read", "conversations.read", "reports.view"]'
    )
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Create admin user for ACME tenant
INSERT INTO users (id, tenant_id, email, password_hash, name, role, is_active)
VALUES 
    (
        'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a19'::uuid,
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
        'admin@acme.com',
        '$2a$10$YpVrLJ1VVkR6JmDhSvCLGutmrWY6uF6SUpOJnxW6qjKnMzI0YWJMm', -- Demo@123
        'ACME Admin',
        'admin',
        true
    )
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Add sample audit log entries
INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, changes, ip_address, user_agent)
VALUES
    (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
        'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid,
        'user.created',
        'user',
        'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'::uuid,
        '{"name": "Sales Agent", "email": "agent@demo.com", "role": "agent"}',
        '192.168.1.1',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    ),
    (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
        'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'::uuid,
        'settings.updated',
        'tenant',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
        '{"theme": {"old": "light", "new": "default"}}',
        '192.168.1.1',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    );

-- Re-enable RLS after seeding
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Output verification
SELECT 'Demo data seeded successfully!' as message;
SELECT 'Tenants created:' as info, count(*) as count FROM tenants;
SELECT 'Users created:' as info, count(*) as count FROM users;
SELECT 'Roles created:' as info, count(*) as count FROM roles;