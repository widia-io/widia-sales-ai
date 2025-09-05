package domain

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RefreshToken struct {
	ID        uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID    uuid.UUID      `json:"user_id" gorm:"type:uuid;not null"`
	Token     string         `json:"token" gorm:"type:varchar(255);unique;not null"`
	ExpiresAt time.Time      `json:"expires_at" gorm:"not null"`
	Revoked   bool           `json:"revoked" gorm:"default:false"`
	RevokedAt *time.Time     `json:"revoked_at"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
	
	// Relations
	User User `json:"-" gorm:"foreignKey:UserID"`
}

// GenerateToken creates a new random refresh token
func GenerateRefreshToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// IsValid checks if the refresh token is valid
func (rt *RefreshToken) IsValid() bool {
	return !rt.Revoked && rt.ExpiresAt.After(time.Now())
}

// Revoke marks the token as revoked
func (rt *RefreshToken) Revoke() {
	rt.Revoked = true
	now := time.Now()
	rt.RevokedAt = &now
}

type RefreshTokenRepository interface {
	Create(token *RefreshToken) error
	FindByToken(token string) (*RefreshToken, error)
	FindByUserID(userID uuid.UUID) ([]*RefreshToken, error)
	Update(token *RefreshToken) error
	RevokeAllForUser(userID uuid.UUID) error
	DeleteExpired() error
}

type RefreshTokenService interface {
	CreateRefreshToken(userID uuid.UUID) (*RefreshToken, error)
	ValidateAndRotate(token string) (*RefreshToken, *User, error)
	RevokeToken(token string) error
	RevokeAllUserTokens(userID uuid.UUID) error
	CleanupExpiredTokens() error
}