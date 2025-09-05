package application

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/widia/widia-connect/internal/domain"
	"gorm.io/gorm"
)

var (
	// ErrUserNotFound is defined in auth_service.go
	ErrUserEmailExists    = errors.New("email already exists for this tenant")
	ErrInvalidEmail       = errors.New("invalid email format")
	ErrInvalidRole        = errors.New("invalid role")
	ErrInvalidPassword    = errors.New("invalid password")
	ErrUserLimitReached   = errors.New("user limit reached for current plan")
	ErrCannotDeleteSelf   = errors.New("cannot delete your own account")
	ErrLastAdmin          = errors.New("cannot delete or deactivate the last admin")
	ErrWrongPassword      = errors.New("incorrect password")
)

// Valid roles
var ValidRoles = []string{"owner", "admin", "agent", "viewer"}

type UserService struct {
	db       *gorm.DB
	userRepo domain.UserRepository
}

func NewUserService(db *gorm.DB, userRepo domain.UserRepository) *UserService {
	return &UserService{
		db:       db,
		userRepo: userRepo,
	}
}

// CreateUser creates a new user for a tenant
func (s *UserService) CreateUser(tenantID uuid.UUID, email, password, name, role string) (*domain.User, error) {
	// Validate email
	if !isValidEmail(email) {
		return nil, ErrInvalidEmail
	}

	// Validate role
	if !isValidRole(role) {
		return nil, ErrInvalidRole
	}

	// Validate password
	if len(password) < 8 {
		return nil, ErrInvalidPassword
	}

	// Check if email already exists for this tenant
	existingUser, _ := s.userRepo.FindByEmailAndTenant(email, tenantID)
	if existingUser != nil {
		return nil, ErrUserEmailExists
	}

	// Check user limit based on plan (TODO: implement plan limits)
	currentCount, err := s.userRepo.CountByTenant(tenantID)
	if err != nil {
		return nil, err
	}

	// Example limit check (should be based on actual plan)
	maxUsers := s.getMaxUsersForTenant(tenantID)
	if currentCount >= maxUsers {
		return nil, ErrUserLimitReached
	}

	// Create user
	user := &domain.User{
		TenantID: tenantID,
		Email:    strings.ToLower(strings.TrimSpace(email)),
		Name:     name,
		Role:     role,
		IsActive: true,
	}

	if err := user.SetPassword(password); err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// GetUser retrieves a user by ID
func (s *UserService) GetUser(id uuid.UUID) (*domain.User, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

// GetUserByEmail retrieves a user by email and tenant
func (s *UserService) GetUserByEmail(tenantID uuid.UUID, email string) (*domain.User, error) {
	user, err := s.userRepo.FindByEmailAndTenant(strings.ToLower(strings.TrimSpace(email)), tenantID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

// ListTenantUsers returns all users for a tenant
func (s *UserService) ListTenantUsers(tenantID uuid.UUID) ([]*domain.User, error) {
	users, err := s.userRepo.FindByTenant(tenantID)
	if err != nil {
		return nil, err
	}
	return users, nil
}

// UpdateUser updates user information
func (s *UserService) UpdateUser(id uuid.UUID, updates map[string]interface{}) (*domain.User, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	// Update allowed fields
	if name, ok := updates["name"].(string); ok {
		user.Name = name
	}

	if email, ok := updates["email"].(string); ok {
		email = strings.ToLower(strings.TrimSpace(email))
		if !isValidEmail(email) {
			return nil, ErrInvalidEmail
		}

		// Check if email is already taken by another user in the same tenant
		if user.Email != email {
			existingUser, _ := s.userRepo.FindByEmailAndTenant(email, user.TenantID)
			if existingUser != nil && existingUser.ID != user.ID {
				return nil, ErrUserEmailExists
			}
		}
		user.Email = email
	}

	if role, ok := updates["role"].(string); ok {
		if !isValidRole(role) {
			return nil, ErrInvalidRole
		}

		// Check if this is the last admin
		if user.Role == "admin" && role != "admin" {
			if err := s.checkLastAdmin(user.TenantID, user.ID); err != nil {
				return nil, err
			}
		}
		user.Role = role
	}

	if isActive, ok := updates["is_active"].(bool); ok {
		// Check if deactivating the last admin
		if user.IsActive && !isActive && user.Role == "admin" {
			if err := s.checkLastAdmin(user.TenantID, user.ID); err != nil {
				return nil, err
			}
		}
		user.IsActive = isActive
	}

	// Save changes
	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return user, nil
}

// DeleteUser deletes a user
func (s *UserService) DeleteUser(id uuid.UUID, currentUserID uuid.UUID) error {
	// Cannot delete yourself
	if id == currentUserID {
		return ErrCannotDeleteSelf
	}

	user, err := s.userRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	// Check if this is the last admin
	if user.Role == "admin" {
		if err := s.checkLastAdmin(user.TenantID, user.ID); err != nil {
			return err
		}
	}

	return s.userRepo.Delete(id)
}

// ChangePassword changes a user's password
func (s *UserService) ChangePassword(id uuid.UUID, oldPassword, newPassword string) error {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	// Verify old password
	if !user.CheckPassword(oldPassword) {
		return ErrWrongPassword
	}

	// Validate new password
	if len(newPassword) < 8 {
		return ErrInvalidPassword
	}

	// Set new password
	if err := user.SetPassword(newPassword); err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Save changes
	return s.userRepo.Update(user)
}

// ResetPassword resets a user's password (admin action)
func (s *UserService) ResetPassword(id uuid.UUID, newPassword string) error {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	// Validate new password
	if len(newPassword) < 8 {
		return ErrInvalidPassword
	}

	// Set new password
	if err := user.SetPassword(newPassword); err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Save changes
	return s.userRepo.Update(user)
}

// UpdateLastLogin updates the user's last login time
func (s *UserService) UpdateLastLogin(id uuid.UUID) error {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return err
	}

	now := time.Now()
	user.LastLoginAt = &now
	return s.userRepo.Update(user)
}

// GetUserStats returns statistics for users in a tenant
func (s *UserService) GetUserStats(tenantID uuid.UUID) (map[string]interface{}, error) {
	users, err := s.userRepo.FindByTenant(tenantID)
	if err != nil {
		return nil, err
	}

	activeCount := 0
	roleCount := make(map[string]int)

	for _, user := range users {
		if user.IsActive {
			activeCount++
		}
		roleCount[user.Role]++
	}

	return map[string]interface{}{
		"total":       len(users),
		"active":      activeCount,
		"inactive":    len(users) - activeCount,
		"by_role":     roleCount,
		"limit":       s.getMaxUsersForTenant(tenantID),
		"remaining":   s.getMaxUsersForTenant(tenantID) - int64(len(users)),
	}, nil
}

// Helper functions

func isValidEmail(email string) bool {
	// Basic email validation
	email = strings.ToLower(strings.TrimSpace(email))
	if len(email) < 3 || len(email) > 255 {
		return false
	}
	if !strings.Contains(email, "@") {
		return false
	}
	parts := strings.Split(email, "@")
	if len(parts) != 2 || len(parts[0]) == 0 || len(parts[1]) == 0 {
		return false
	}
	if !strings.Contains(parts[1], ".") {
		return false
	}
	return true
}

func isValidRole(role string) bool {
	for _, validRole := range ValidRoles {
		if role == validRole {
			return true
		}
	}
	return false
}

func (s *UserService) checkLastAdmin(tenantID uuid.UUID, excludeUserID uuid.UUID) error {
	users, err := s.userRepo.FindByTenant(tenantID)
	if err != nil {
		return err
	}

	adminCount := 0
	for _, user := range users {
		if user.ID != excludeUserID && user.Role == "admin" && user.IsActive {
			adminCount++
		}
	}

	if adminCount == 0 {
		return ErrLastAdmin
	}

	return nil
}

func (s *UserService) getMaxUsersForTenant(tenantID uuid.UUID) int64 {
	// TODO: Implement actual plan limits based on subscription
	// For now, return default limits
	return 100 // Default limit
}