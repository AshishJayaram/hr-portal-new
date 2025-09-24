package repositories

import (
	"fmt"

	"hr-portal-backend/internal/models"
)

// companySettingsRepository implements CompanySettingsRepository interface
type companySettingsRepository struct {
	*BaseRepository
}

func (r *companySettingsRepository) Create(settings *models.CompanySettings) error {
	if err := r.db.Create(settings).Error; err != nil {
		return fmt.Errorf("failed to create company settings: %w", err)
	}
	return nil
}

func (r *companySettingsRepository) GetByOrganizationID(organizationID string) (*models.CompanySettings, error) {
	var settings models.CompanySettings
	if err := r.db.Where("organization_id = ?", organizationID).First(&settings).Error; err != nil {
		return nil, fmt.Errorf("company settings not found: %w", err)
	}
	return &settings, nil
}

func (r *companySettingsRepository) Update(settings *models.CompanySettings) error {
	if err := r.db.Save(settings).Error; err != nil {
		return fmt.Errorf("failed to update company settings: %w", err)
	}
	return nil
}

func (r *companySettingsRepository) Delete(organizationID string) error {
	if err := r.db.Delete(&models.CompanySettings{}, "organization_id = ?", organizationID).Error; err != nil {
		return fmt.Errorf("failed to delete company settings: %w", err)
	}
	return nil
}
