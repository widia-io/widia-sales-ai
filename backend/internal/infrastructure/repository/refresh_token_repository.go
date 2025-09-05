package repository

import (
	"time"

	"github.com/google/uuid"
	"github.com/widia/widia-connect/internal/domain"
	"gorm.io/gorm"
)

type RefreshTokenRepository struct {
	db *gorm.DB
}

func NewRefreshTokenRepository(db *gorm.DB) domain.RefreshTokenRepository {
	return &RefreshTokenRepository{db: db}
}

func (r *RefreshTokenRepository) Create(token *domain.RefreshToken) error {
	return r.db.Create(token).Error
}

func (r *RefreshTokenRepository) FindByToken(token string) (*domain.RefreshToken, error) {
	var refreshToken domain.RefreshToken
	err := r.db.Where("token = ? AND revoked = false", token).First(&refreshToken).Error
	if err != nil {
		return nil, err
	}
	return &refreshToken, nil
}

func (r *RefreshTokenRepository) FindByUserID(userID uuid.UUID) ([]*domain.RefreshToken, error) {
	var tokens []*domain.RefreshToken
	err := r.db.Where("user_id = ? AND revoked = false", userID).Find(&tokens).Error
	return tokens, err
}

func (r *RefreshTokenRepository) Update(token *domain.RefreshToken) error {
	return r.db.Save(token).Error
}

func (r *RefreshTokenRepository) RevokeAllForUser(userID uuid.UUID) error {
	now := time.Now()
	return r.db.Model(&domain.RefreshToken{}).
		Where("user_id = ? AND revoked = false", userID).
		Updates(map[string]interface{}{
			"revoked":    true,
			"revoked_at": now,
		}).Error
}

func (r *RefreshTokenRepository) DeleteExpired() error {
	// Delete tokens that are either expired or revoked more than 30 days ago
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	
	return r.db.Where(
		"expires_at < ? OR (revoked = true AND revoked_at < ?)",
		time.Now(), thirtyDaysAgo,
	).Delete(&domain.RefreshToken{}).Error
}