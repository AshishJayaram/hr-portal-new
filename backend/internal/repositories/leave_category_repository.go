package repositories

import (
	"fmt"
	"strconv"

	"hr-portal-backend/internal/models"
)

// leaveCategoryRepository implements LeaveCategoryRepository interface
type leaveCategoryRepository struct {
	*BaseRepository
}

func (r *leaveCategoryRepository) Create(category *models.LeaveCategory) error {
	if err := r.db.Create(category).Error; err != nil {
		return fmt.Errorf("failed to create leave category: %w", err)
	}
	return nil
}

func (r *leaveCategoryRepository) GetByID(id string) (*models.LeaveCategory, error) {
	var category models.LeaveCategory
	if err := r.db.Where("id = ?", id).First(&category).Error; err != nil {
		return nil, fmt.Errorf("leave category not found: %w", err)
	}
	return &category, nil
}

func (r *leaveCategoryRepository) List(organizationID string) ([]models.LeaveCategory, error) {
	var categories []models.LeaveCategory

	// Convert organization ID to uint for database query
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		// If conversion fails, try querying with string directly (for UUID or other formats)
		if err := r.db.Where("organization_id = ? AND is_active = ?", organizationID, 1).Find(&categories).Error; err != nil {
			return nil, fmt.Errorf("failed to list leave categories: %w", err)
		}
		return categories, nil
	}

	// Use uint for query
	if err := r.db.Where("organization_id = ? AND is_active = ?", uint(orgIDUint), 1).Find(&categories).Error; err != nil {
		return nil, fmt.Errorf("failed to list leave categories: %w", err)
	}
	return categories, nil
}

func (r *leaveCategoryRepository) Update(category *models.LeaveCategory) error {
	if err := r.db.Save(category).Error; err != nil {
		return fmt.Errorf("failed to update leave category: %w", err)
	}
	return nil
}

func (r *leaveCategoryRepository) Delete(id string) error {
	if err := r.db.Model(&models.LeaveCategory{}).Where("id = ?", id).Update("is_active", false).Error; err != nil {
		return fmt.Errorf("failed to delete leave category: %w", err)
	}
	return nil
}
