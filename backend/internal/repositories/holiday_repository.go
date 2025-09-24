package repositories

import (
	"fmt"

	"hr-portal-backend/internal/models"
)

// holidayRepository implements HolidayRepository interface
type holidayRepository struct {
	*BaseRepository
}

func (r *holidayRepository) Create(holiday *models.Holiday) error {
	if err := r.db.Create(holiday).Error; err != nil {
		return fmt.Errorf("failed to create holiday: %w", err)
	}
	return nil
}

func (r *holidayRepository) GetByID(id string) (*models.Holiday, error) {
	var holiday models.Holiday
	if err := r.db.Where("id = ?", id).First(&holiday).Error; err != nil {
		return nil, fmt.Errorf("holiday not found: %w", err)
	}
	return &holiday, nil
}

func (r *holidayRepository) List(organizationID string, filters map[string]interface{}) ([]models.Holiday, error) {
	var holidays []models.Holiday
	query := r.db.Where("organization_id = ?", organizationID)
	query = r.buildQuery(query, filters)

	if err := query.Find(&holidays).Error; err != nil {
		return nil, fmt.Errorf("failed to list holidays: %w", err)
	}
	return holidays, nil
}

func (r *holidayRepository) Update(holiday *models.Holiday) error {
	if err := r.db.Save(holiday).Error; err != nil {
		return fmt.Errorf("failed to update holiday: %w", err)
	}
	return nil
}

func (r *holidayRepository) Delete(id string) error {
	if err := r.db.Where("id = ?", id).Delete(&models.Holiday{}).Error; err != nil {
		return fmt.Errorf("failed to delete holiday: %w", err)
	}
	return nil
}
