package repositories

import (
	"fmt"

	"hr-portal-backend/internal/models"
)

// leaveAllocationRepository implements LeaveAllocationRepository interface
type leaveAllocationRepository struct {
	*BaseRepository
}

func (r *leaveAllocationRepository) Create(allocation *models.LeaveAllocation) error {
	if err := r.db.Create(allocation).Error; err != nil {
		return fmt.Errorf("failed to create leave allocation: %w", err)
	}
	return nil
}

func (r *leaveAllocationRepository) GetByID(id string) (*models.LeaveAllocation, error) {
	var allocation models.LeaveAllocation
	if err := r.db.Preload("User").Preload("Category").Where("id = ?", id).First(&allocation).Error; err != nil {
		return nil, fmt.Errorf("leave allocation not found: %w", err)
	}
	return &allocation, nil
}

func (r *leaveAllocationRepository) GetByUserID(userID string, year int) ([]models.LeaveAllocation, error) {
	var allocations []models.LeaveAllocation
	query := r.db.Preload("Category").Where("user_id = ? AND year = ?", userID, year)

	if err := query.Find(&allocations).Error; err != nil {
		return nil, fmt.Errorf("failed to get user leave allocations: %w", err)
	}
	return allocations, nil
}

func (r *leaveAllocationRepository) List(organizationID string, filters map[string]interface{}) ([]models.LeaveAllocation, error) {
	var allocations []models.LeaveAllocation
	query := r.db.Preload("User").Preload("Category").Where("organization_id = ?", organizationID)
	query = r.buildQuery(query, filters)

	if err := query.Find(&allocations).Error; err != nil {
		return nil, fmt.Errorf("failed to list leave allocations: %w", err)
	}
	return allocations, nil
}

func (r *leaveAllocationRepository) Update(allocation *models.LeaveAllocation) error {
	if err := r.db.Save(allocation).Error; err != nil {
		return fmt.Errorf("failed to update leave allocation: %w", err)
	}
	return nil
}

func (r *leaveAllocationRepository) Delete(id string) error {
	if err := r.db.Delete(&models.LeaveAllocation{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete leave allocation: %w", err)
	}
	return nil
}

func (r *leaveAllocationRepository) UpdateUsedDays(userID, categoryID string, year int, days int) error {
	if err := r.db.Model(&models.LeaveAllocation{}).
		Where("user_id = ? AND category_id = ? AND year = ?", userID, categoryID, year).
		Update("used_days", days).Error; err != nil {
		return fmt.Errorf("failed to update used days: %w", err)
	}
	return nil
}
