package database

import (
	"fmt"
	"log"

	"github.com/spf13/viper"
	"github.com/widia/widia-connect/internal/domain"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Initialize() (*gorm.DB, error) {
	dsn := viper.GetString("DATABASE_URL")
	
	config := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	}
	
	if viper.GetString("ENV") == "production" {
		config.Logger = logger.Default.LogMode(logger.Error)
	}
	
	db, err := gorm.Open(postgres.Open(dsn), config)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	
	// Enable UUID extension
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"").Error; err != nil {
		log.Printf("Failed to create uuid-ossp extension: %v", err)
	}
	
	// Enable pgcrypto extension
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\"").Error; err != nil {
		log.Printf("Failed to create pgcrypto extension: %v", err)
	}
	
	return db, nil
}

func Migrate(db *gorm.DB) error {
	// Auto migrate domain models
	if err := db.AutoMigrate(
		&domain.Tenant{},
		&domain.User{},
	); err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}
	
	// Create unique index for user email within tenant
	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email 
		ON users(tenant_id, email) 
		WHERE deleted_at IS NULL
	`).Error; err != nil {
		return fmt.Errorf("failed to create unique index: %w", err)
	}
	
	// Enable RLS on users table
	if err := enableRLS(db); err != nil {
		return fmt.Errorf("failed to enable RLS: %w", err)
	}
	
	return nil
}

func enableRLS(db *gorm.DB) error {
	// Enable RLS on users table
	if err := db.Exec("ALTER TABLE users ENABLE ROW LEVEL SECURITY").Error; err != nil {
		log.Printf("RLS might already be enabled: %v", err)
	}
	
	// Drop existing policy if exists
	db.Exec("DROP POLICY IF EXISTS tenant_isolation_policy ON users")
	
	// Create RLS policy for tenant isolation
	if err := db.Exec(`
		CREATE POLICY tenant_isolation_policy ON users
		FOR ALL
		USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
		WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
	`).Error; err != nil {
		return fmt.Errorf("failed to create RLS policy: %w", err)
	}
	
	return nil
}