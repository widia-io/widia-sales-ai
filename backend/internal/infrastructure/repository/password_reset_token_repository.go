package repository

import (
	"time"

	"github.com/google/uuid"
	"github.com/widia/widia-connect/internal/domain"
	"gorm.io/gorm"
)

// PasswordResetTokenRepository provides database operations for password reset tokens
type PasswordResetTokenRepository struct {
	db *gorm.DB
}

// NewPasswordResetTokenRepository creates a new PasswordResetTokenRepository
func NewPasswordResetTokenRepository(db *gorm.DB) *PasswordResetTokenRepository {
	return &PasswordResetTokenRepository{db: db}
}

// Create creates a new password reset token
func (r *PasswordResetTokenRepository) Create(token *domain.PasswordResetToken) error {
	return r.db.Create(token).Error
}

// GetByToken retrieves a password reset token by its token string
func (r *PasswordResetTokenRepository) GetByToken(token string) (*domain.PasswordResetToken, error) {
	var resetToken domain.PasswordResetToken
	err := r.db.Where("token = ?", token).First(&resetToken).Error
	if err != nil {
		return nil, err
	}
	return &resetToken, nil
}

// GetByUserID retrieves all password reset tokens for a user
func (r *PasswordResetTokenRepository) GetByUserID(userID uuid.UUID) ([]*domain.PasswordResetToken, error) {
	var tokens []*domain.PasswordResetToken
	err := r.db.Where("user_id = ?", userID).Find(&tokens).Error
	return tokens, err
}

// MarkAsUsed marks a token as used
func (r *PasswordResetTokenRepository) MarkAsUsed(tokenID uuid.UUID) error {
	return r.db.Model(&domain.PasswordResetToken{}).
		Where("id = ?", tokenID).
		Update("used", true).Error
}

// InvalidateUserTokens invalidates all tokens for a user
func (r *PasswordResetTokenRepository) InvalidateUserTokens(userID uuid.UUID) error {
	return r.db.Model(&domain.PasswordResetToken{}).
		Where("user_id = ? AND used = false AND expires_at > ?", userID, time.Now()).
		Update("used", true).Error
}

// DeleteExpired deletes all expired tokens
func (r *PasswordResetTokenRepository) DeleteExpired() error {
	return r.db.Where("expires_at < ?", time.Now()).Delete(&domain.PasswordResetToken{}).Error
}

// DeleteByUserID deletes all tokens for a user
func (r *PasswordResetTokenRepository) DeleteByUserID(userID uuid.UUID) error {
	return r.db.Where("user_id = ?", userID).Delete(&domain.PasswordResetToken{}).Error
}