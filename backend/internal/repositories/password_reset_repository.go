package repositories

import (
	"fmt"
	"time"

	"hr-portal-backend/internal/models"

	"gorm.io/gorm"
)

type passwordResetRepository struct {
	*BaseRepository
}

// NewPasswordResetRepository creates a new password reset repository
func NewPasswordResetRepository(db *gorm.DB, rdb interface{}) PasswordResetRepository {
	return &passwordResetRepository{
		BaseRepository: NewBaseRepository(db, nil),
	}
}

func (r *passwordResetRepository) Create(token *models.PasswordResetToken) error {
	if err := r.db.Create(token).Error; err != nil {
		return fmt.Errorf("failed to create password reset token: %w", err)
	}
	return nil
}

func (r *passwordResetRepository) GetByToken(token string) (*models.PasswordResetToken, error) {
	var resetToken models.PasswordResetToken
	if err := r.db.Where("token = ? AND used = ?", token, false).
		Preload("User").
		First(&resetToken).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("token not found or already used")
		}
		return nil, fmt.Errorf("failed to get token: %w", err)
	}

	// Check if token has expired
	if resetToken.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("token has expired")
	}

	return &resetToken, nil
}

func (r *passwordResetRepository) MarkAsUsed(token string) error {
	if err := r.db.Model(&models.PasswordResetToken{}).
		Where("token = ?", token).
		Update("used", true).Error; err != nil {
		return fmt.Errorf("failed to mark token as used: %w", err)
	}
	return nil
}

func (r *passwordResetRepository) DeleteExpiredTokens() error {
	// Delete tokens that are expired or older than 7 days
	if err := r.db.Where("expires_at < ? OR (used = ? AND created_at < ?)",
		time.Now(), true, time.Now().AddDate(0, 0, -7)).
		Delete(&models.PasswordResetToken{}).Error; err != nil {
		return fmt.Errorf("failed to delete expired tokens: %w", err)
	}
	return nil
}

func (r *passwordResetRepository) InvalidateUserTokens(userID string) error {
	// Invalidate all unused tokens for a user
	if err := r.db.Model(&models.PasswordResetToken{}).
		Where("user_id = ? AND used = ?", userID, false).
		Update("used", true).Error; err != nil {
		return fmt.Errorf("failed to invalidate user tokens: %w", err)
	}
	return nil
}
