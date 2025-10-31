package repositories

import (
	"fmt"
	"time"

	"hr-portal-backend/internal/models"

	"gorm.io/gorm"
)

type otpRepository struct {
	*BaseRepository
}

// NewOTPRepository creates a new OTP repository
func NewOTPRepository(db *gorm.DB, rdb interface{}) OTPRepository {
	return &otpRepository{
		BaseRepository: NewBaseRepository(db, nil),
	}
}

func (r *otpRepository) Create(otp *models.OTPToken) error {
	if err := r.db.Create(otp).Error; err != nil {
		return fmt.Errorf("failed to create OTP token: %w", err)
	}
	return nil
}

func (r *otpRepository) GetByEmailAndOTP(email, otp string) (*models.OTPToken, error) {
	var otpToken models.OTPToken
	if err := r.db.Where("email = ? AND otp = ? AND used = ?", email, otp, false).
		Preload("User").
		Order("created_at DESC").
		First(&otpToken).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("invalid or expired OTP")
		}
		return nil, fmt.Errorf("failed to get OTP token: %w", err)
	}

	// Check if token has expired
	if otpToken.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("OTP has expired")
	}

	return &otpToken, nil
}

func (r *otpRepository) MarkAsUsed(otp string) error {
	if err := r.db.Model(&models.OTPToken{}).
		Where("otp = ?", otp).
		Update("used", true).Error; err != nil {
		return fmt.Errorf("failed to mark OTP as used: %w", err)
	}
	return nil
}

func (r *otpRepository) DeleteExpiredOTPs() error {
	// Delete OTPs that are expired or older than 1 hour
	if err := r.db.Where("expires_at < ? OR (used = ? AND created_at < ?)",
		time.Now(), true, time.Now().Add(-1*time.Hour)).
		Delete(&models.OTPToken{}).Error; err != nil {
		return fmt.Errorf("failed to delete expired OTPs: %w", err)
	}
	return nil
}

func (r *otpRepository) InvalidateUserOTPs(email string) error {
	// Invalidate all unused OTPs for an email
	if err := r.db.Model(&models.OTPToken{}).
		Where("email = ? AND used = ?", email, false).
		Update("used", true).Error; err != nil {
		return fmt.Errorf("failed to invalidate user OTPs: %w", err)
	}
	return nil
}
