package application

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/widia/widia-connect/internal/domain"
	"github.com/widia/widia-connect/internal/infrastructure/email"
	"github.com/widia/widia-connect/internal/interfaces/http/middleware"
	"gorm.io/gorm"
)

var (
	ErrInvalidRefreshToken  = errors.New("invalid refresh token")
	ErrTokenExpired         = errors.New("refresh token expired")
	ErrUserNotFound         = errors.New("user not found")
	ErrInvalidCredentials   = errors.New("invalid credentials")
	ErrInvalidResetToken    = errors.New("invalid or expired reset token")
	ErrResetTokenUsed       = errors.New("reset token already used")
)

type AuthService struct {
	db                     *gorm.DB
	userRepo               domain.UserRepository
	refreshTokenRepo       domain.RefreshTokenRepository
	resetTokenRepo         domain.PasswordResetTokenRepository
	refreshTokenExpiration time.Duration
	resetTokenExpiration   time.Duration
	emailService           *email.EmailService
}

func NewAuthService(
	db *gorm.DB,
	userRepo domain.UserRepository,
	refreshTokenRepo domain.RefreshTokenRepository,
) *AuthService {
	return &AuthService{
		db:                     db,
		userRepo:               userRepo,
		refreshTokenRepo:       refreshTokenRepo,
		refreshTokenExpiration: 7 * 24 * time.Hour, // 7 days
		resetTokenExpiration:   1 * time.Hour,       // 1 hour
		emailService:           email.NewEmailService(),
	}
}

// NewAuthServiceWithResetToken creates an AuthService with reset token support
func NewAuthServiceWithResetToken(
	db *gorm.DB,
	userRepo domain.UserRepository,
	refreshTokenRepo domain.RefreshTokenRepository,
	resetTokenRepo domain.PasswordResetTokenRepository,
) *AuthService {
	return &AuthService{
		db:                     db,
		userRepo:               userRepo,
		refreshTokenRepo:       refreshTokenRepo,
		resetTokenRepo:         resetTokenRepo,
		refreshTokenExpiration: 7 * 24 * time.Hour, // 7 days
		resetTokenExpiration:   1 * time.Hour,       // 1 hour
		emailService:           email.NewEmailService(),
	}
}

// Login authenticates a user and returns tokens
func (s *AuthService) Login(email, password string, tenantID uuid.UUID) (*domain.User, string, string, error) {
	// Find user
	user, err := s.userRepo.FindByEmailAndTenant(email, tenantID)
	if err != nil {
		return nil, "", "", ErrInvalidCredentials
	}

	// Check password
	if !user.CheckPassword(password) {
		return nil, "", "", ErrInvalidCredentials
	}

	// Check if user is active
	if !user.IsActive {
		return nil, "", "", errors.New("user account is disabled")
	}

	// Update last login
	now := time.Now()
	user.LastLoginAt = &now
	if err := s.userRepo.Update(user); err != nil {
		return nil, "", "", err
	}

	// Generate access token
	accessToken, err := middleware.GenerateToken(user.ID, user.TenantID, user.Email, user.Role)
	if err != nil {
		return nil, "", "", err
	}

	// Create refresh token
	refreshToken, err := s.CreateRefreshToken(user.ID)
	if err != nil {
		return nil, "", "", err
	}

	return user, accessToken, refreshToken.Token, nil
}

// CreateRefreshToken creates a new refresh token for a user
func (s *AuthService) CreateRefreshToken(userID uuid.UUID) (*domain.RefreshToken, error) {
	// Generate token string
	tokenString, err := domain.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	// Create token record
	refreshToken := &domain.RefreshToken{
		UserID:    userID,
		Token:     tokenString,
		ExpiresAt: time.Now().Add(s.refreshTokenExpiration),
	}

	if err := s.refreshTokenRepo.Create(refreshToken); err != nil {
		return nil, err
	}

	return refreshToken, nil
}

// ValidateAndRotate validates a refresh token and rotates it
func (s *AuthService) ValidateAndRotate(tokenString string) (*domain.User, string, string, error) {
	// Find the refresh token
	refreshToken, err := s.refreshTokenRepo.FindByToken(tokenString)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, "", "", ErrInvalidRefreshToken
		}
		return nil, "", "", err
	}

	// Check if token is valid
	if !refreshToken.IsValid() {
		return nil, "", "", ErrTokenExpired
	}

	// Get the user
	user, err := s.userRepo.FindByID(refreshToken.UserID)
	if err != nil {
		return nil, "", "", ErrUserNotFound
	}

	// Check if user is active
	if !user.IsActive {
		// Revoke the token
		refreshToken.Revoke()
		s.refreshTokenRepo.Update(refreshToken)
		return nil, "", "", errors.New("user account is disabled")
	}

	// Revoke the old token
	refreshToken.Revoke()
	if err := s.refreshTokenRepo.Update(refreshToken); err != nil {
		return nil, "", "", err
	}

	// Create new refresh token
	newRefreshToken, err := s.CreateRefreshToken(user.ID)
	if err != nil {
		return nil, "", "", err
	}

	// Generate new access token
	accessToken, err := middleware.GenerateToken(user.ID, user.TenantID, user.Email, user.Role)
	if err != nil {
		return nil, "", "", err
	}

	return user, accessToken, newRefreshToken.Token, nil
}

// Logout revokes a refresh token
func (s *AuthService) Logout(tokenString string) error {
	refreshToken, err := s.refreshTokenRepo.FindByToken(tokenString)
	if err != nil {
		// If token not found, consider it already logged out
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	refreshToken.Revoke()
	return s.refreshTokenRepo.Update(refreshToken)
}

// RevokeAllUserTokens revokes all refresh tokens for a user
func (s *AuthService) RevokeAllUserTokens(userID uuid.UUID) error {
	return s.refreshTokenRepo.RevokeAllForUser(userID)
}

// CleanupExpiredTokens removes expired and old revoked tokens
func (s *AuthService) CleanupExpiredTokens() error {
	return s.refreshTokenRepo.DeleteExpired()
}

// RequestPasswordReset creates a password reset token for a user
func (s *AuthService) RequestPasswordReset(email string, tenantSlug string) (string, error) {
	// Find tenant by slug
	var tenant domain.Tenant
	if err := s.db.Where("slug = ?", tenantSlug).First(&tenant).Error; err != nil {
		// Don't reveal if tenant exists
		return "", nil
	}
	
	// Find user by email and tenant
	user, err := s.userRepo.FindByEmailAndTenant(email, tenant.ID)
	if err != nil {
		// Don't reveal if user exists
		return "", nil
	}
	
	// Check if user is active
	if !user.IsActive {
		return "", nil
	}
	
	// Invalidate existing tokens for this user
	if s.resetTokenRepo != nil {
		s.resetTokenRepo.InvalidateUserTokens(user.ID)
	}
	
	// Generate secure random token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", err
	}
	token := hex.EncodeToString(tokenBytes)
	
	// Create reset token
	resetToken := &domain.PasswordResetToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(s.resetTokenExpiration),
		Used:      false,
	}
	
	if s.resetTokenRepo != nil {
		if err := s.resetTokenRepo.Create(resetToken); err != nil {
			return "", err
		}
	}
	
	// Send password reset email
	if s.emailService != nil {
		go func() {
			println("Attempting to send password reset email to:", user.Email)
			if err := s.emailService.SendPasswordResetEmail(user.Email, user.Name, token); err != nil {
				// Log error but don't fail the request
				// In production, you'd want proper logging here
				println("Failed to send password reset email:", err.Error())
			} else {
				println("Password reset email sent successfully to:", user.Email)
			}
		}()
	} else {
		println("Email service is not configured")
	}
	
	return token, nil
}

// ResetPassword resets a user's password using a valid reset token
func (s *AuthService) ResetPassword(token string, newPassword string) error {
	if s.resetTokenRepo == nil {
		return errors.New("password reset not configured")
	}
	
	// Find the reset token
	resetToken, err := s.resetTokenRepo.GetByToken(token)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrInvalidResetToken
		}
		return err
	}
	
	// Check if token is valid
	if !resetToken.IsValid() {
		if resetToken.Used {
			return ErrResetTokenUsed
		}
		return ErrInvalidResetToken
	}
	
	// Get the user
	user, err := s.userRepo.FindByID(resetToken.UserID)
	if err != nil {
		return ErrUserNotFound
	}
	
	// Validate password
	if len(newPassword) < 8 {
		return ErrInvalidPassword
	}
	
	// Update user password
	if err := user.SetPassword(newPassword); err != nil {
		return err
	}
	
	// Save user with new password
	if err := s.userRepo.Update(user); err != nil {
		return err
	}
	
	// Mark token as used
	if err := s.resetTokenRepo.MarkAsUsed(resetToken.ID); err != nil {
		return err
	}
	
	// Revoke all refresh tokens for security
	s.refreshTokenRepo.RevokeAllForUser(user.ID)
	
	return nil
}

// ValidateResetToken checks if a reset token is valid
func (s *AuthService) ValidateResetToken(token string) error {
	if s.resetTokenRepo == nil {
		return errors.New("password reset not configured")
	}
	
	resetToken, err := s.resetTokenRepo.GetByToken(token)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrInvalidResetToken
		}
		return err
	}
	
	if !resetToken.IsValid() {
		if resetToken.Used {
			return ErrResetTokenUsed
		}
		return ErrInvalidResetToken
	}
	
	return nil
}