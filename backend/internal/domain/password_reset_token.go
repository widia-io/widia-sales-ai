package domain

import (
	"time"

	"github.com/google/uuid"
)

// PasswordResetToken represents a password reset token in the system
type PasswordResetToken struct {
	ID        uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primary_key" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Token     string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"token"`
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	Used      bool      `gorm:"default:false" json:"used"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	
	// Relations
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName returns the table name for the PasswordResetToken model
func (PasswordResetToken) TableName() string {
	return "password_reset_tokens"
}

// IsExpired checks if the token has expired
func (t *PasswordResetToken) IsExpired() bool {
	return time.Now().After(t.ExpiresAt)
}

// IsValid checks if the token is valid (not used and not expired)
func (t *PasswordResetToken) IsValid() bool {
	return !t.Used && !t.IsExpired()
}

// PasswordResetTokenRepository interface for password reset token operations
type PasswordResetTokenRepository interface {
	Create(token *PasswordResetToken) error
	GetByToken(token string) (*PasswordResetToken, error)
	GetByUserID(userID uuid.UUID) ([]*PasswordResetToken, error)
	MarkAsUsed(tokenID uuid.UUID) error
	InvalidateUserTokens(userID uuid.UUID) error
	DeleteExpired() error
	DeleteByUserID(userID uuid.UUID) error
}