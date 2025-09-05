package application

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/widia/widia-connect/internal/domain"
	"github.com/widia/widia-connect/internal/interfaces/http/middleware"
	"gorm.io/gorm"
)

var (
	ErrInvalidRefreshToken = errors.New("invalid refresh token")
	ErrTokenExpired        = errors.New("refresh token expired")
	ErrUserNotFound        = errors.New("user not found")
	ErrInvalidCredentials  = errors.New("invalid credentials")
)

type AuthService struct {
	db                     *gorm.DB
	userRepo               domain.UserRepository
	refreshTokenRepo       domain.RefreshTokenRepository
	refreshTokenExpiration time.Duration
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