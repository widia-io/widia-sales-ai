package application

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/widia/widia-connect/internal/domain"
	"gorm.io/gorm"
)

var (
	ErrTenantNotFound     = errors.New("tenant not found")
	ErrTenantSlugExists   = errors.New("tenant slug already exists")
	ErrTenantDomainExists = errors.New("tenant domain already exists")
	ErrInvalidSlug        = errors.New("invalid slug format")
	ErrInvalidDomain      = errors.New("invalid domain format")
)

type TenantService struct {
	db         *gorm.DB
	tenantRepo domain.TenantRepository
	userRepo   domain.UserRepository
}

func NewTenantService(
	db *gorm.DB,
	tenantRepo domain.TenantRepository,
	userRepo domain.UserRepository,
) *TenantService {
	return &TenantService{
		db:         db,
		tenantRepo: tenantRepo,
		userRepo:   userRepo,
	}
}

// CreateTenant creates a new tenant with an admin user
func (s *TenantService) CreateTenant(name, slug, adminEmail, adminPassword, adminName string) (*domain.Tenant, *domain.User, error) {
	// Validate slug
	if !isValidSlug(slug) {
		return nil, nil, ErrInvalidSlug
	}

	// Check if slug exists
	exists, err := s.tenantRepo.ExistsBySlug(slug)
	if err != nil {
		return nil, nil, err
	}
	if exists {
		return nil, nil, ErrTenantSlugExists
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create tenant
	tenant := &domain.Tenant{
		Name: name,
		Slug: slug,
		Settings: domain.JSON{
			"onboarding_completed": false,
			"features": map[string]bool{
				"chat_enabled":     true,
				"crm_enabled":      false,
				"calendar_enabled": false,
			},
		},
		SubscriptionStatus: "trial",
	}

	// Set trial end date (14 days)
	trialEnd := time.Now().Add(14 * 24 * time.Hour)
	tenant.SubscriptionEndsAt = &trialEnd

	if err := tx.Create(tenant).Error; err != nil {
		tx.Rollback()
		return nil, nil, fmt.Errorf("failed to create tenant: %w", err)
	}

	// Create admin user
	user := &domain.User{
		TenantID: tenant.ID,
		Email:    adminEmail,
		Name:     adminName,
		Role:     "admin",
		IsActive: true,
	}

	if err := user.SetPassword(adminPassword); err != nil {
		tx.Rollback()
		return nil, nil, fmt.Errorf("failed to hash password: %w", err)
	}

	if err := tx.Create(user).Error; err != nil {
		tx.Rollback()
		return nil, nil, fmt.Errorf("failed to create admin user: %w", err)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return tenant, user, nil
}

// GetTenant retrieves a tenant by ID
func (s *TenantService) GetTenant(id uuid.UUID) (*domain.Tenant, error) {
	tenant, err := s.tenantRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTenantNotFound
		}
		return nil, err
	}
	return tenant, nil
}

// GetTenantBySlug retrieves a tenant by slug
func (s *TenantService) GetTenantBySlug(slug string) (*domain.Tenant, error) {
	tenant, err := s.tenantRepo.FindBySlug(slug)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTenantNotFound
		}
		return nil, err
	}
	return tenant, nil
}

// UpdateTenant updates tenant information
func (s *TenantService) UpdateTenant(id uuid.UUID, updates map[string]interface{}) (*domain.Tenant, error) {
	tenant, err := s.tenantRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTenantNotFound
		}
		return nil, err
	}

	// Validate domain if being updated
	if newDomain, ok := updates["domain"].(string); ok && newDomain != "" {
		if !isValidDomain(newDomain) {
			return nil, ErrInvalidDomain
		}

		// Check if domain is already taken
		if tenant.Domain == nil || *tenant.Domain != newDomain {
			exists, err := s.tenantRepo.ExistsByDomain(newDomain)
			if err != nil {
				return nil, err
			}
			if exists {
				return nil, ErrTenantDomainExists
			}
		}
		tenant.Domain = &newDomain
	}

	// Update other fields
	if name, ok := updates["name"].(string); ok {
		tenant.Name = name
	}

	if settings, ok := updates["settings"].(domain.JSON); ok {
		// Merge settings instead of replacing
		for key, value := range settings {
			tenant.Settings[key] = value
		}
	}

	if subscriptionStatus, ok := updates["subscription_status"].(string); ok {
		tenant.SubscriptionStatus = subscriptionStatus
	}

	if subscriptionEndsAt, ok := updates["subscription_ends_at"].(*time.Time); ok {
		tenant.SubscriptionEndsAt = subscriptionEndsAt
	}

	// Save changes
	if err := s.tenantRepo.Update(tenant); err != nil {
		return nil, err
	}

	return tenant, nil
}

// DeleteTenant soft deletes a tenant and all associated data
func (s *TenantService) DeleteTenant(id uuid.UUID) error {
	// Check if tenant exists
	_, err := s.tenantRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrTenantNotFound
		}
		return err
	}

	// In a real application, you might want to:
	// 1. Cancel subscriptions
	// 2. Export data
	// 3. Notify users
	// 4. Schedule hard delete after X days

	// Soft delete the tenant
	return s.tenantRepo.Delete(id)
}

// ListTenants returns a paginated list of tenants (for super admin)
func (s *TenantService) ListTenants(limit, offset int) ([]*domain.Tenant, int64, error) {
	tenants, err := s.tenantRepo.List(limit, offset)
	if err != nil {
		return nil, 0, err
	}

	count, err := s.tenantRepo.Count()
	if err != nil {
		return nil, 0, err
	}

	return tenants, count, nil
}

// GetTenantStats returns statistics for a tenant
func (s *TenantService) GetTenantStats(tenantID uuid.UUID) (map[string]interface{}, error) {
	// Get user count
	userCount, err := s.userRepo.CountByTenant(tenantID)
	if err != nil {
		return nil, err
	}

	// Get tenant
	tenant, err := s.tenantRepo.FindByID(tenantID)
	if err != nil {
		return nil, err
	}

	stats := map[string]interface{}{
		"user_count":          userCount,
		"subscription_status": tenant.SubscriptionStatus,
		"created_at":          tenant.CreatedAt,
	}

	if tenant.SubscriptionEndsAt != nil {
		stats["subscription_ends_at"] = tenant.SubscriptionEndsAt
		stats["days_remaining"] = int(time.Until(*tenant.SubscriptionEndsAt).Hours() / 24)
	}

	return stats, nil
}

// Helper functions

func isValidSlug(slug string) bool {
	// Slug must be lowercase, alphanumeric with hyphens, 3-63 characters
	if len(slug) < 3 || len(slug) > 63 {
		return false
	}
	
	matched, _ := regexp.MatchString("^[a-z0-9][a-z0-9-]*[a-z0-9]$", slug)
	return matched
}

func isValidDomain(domain string) bool {
	// Basic domain validation
	if len(domain) < 3 || len(domain) > 255 {
		return false
	}
	
	// Must contain at least one dot
	if !strings.Contains(domain, ".") {
		return false
	}
	
	// Basic regex for domain validation
	matched, _ := regexp.MatchString(`^([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.)+[a-zA-Z]{2,}$`, domain)
	return matched
}