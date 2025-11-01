package repositories

import (
	"fmt"
	"strconv"

	"hr-portal-backend/internal/models"

	"gorm.io/gorm"
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
	// Don't use Preload for Category to avoid errors if category was deleted
	// Only preload User which should always exist
	if err := r.db.Preload("User").Where("id = ?", id).First(&allocation).Error; err != nil {
		return nil, fmt.Errorf("leave allocation not found: %w", err)
	}
	// Category may be nil if it was deleted - that's okay, don't fail
	return &allocation, nil
}

func (r *leaveAllocationRepository) GetByUserID(userID string, year int) ([]models.LeaveAllocation, error) {
	var allocations []models.LeaveAllocation

	// Convert string userID to uint
	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	query := r.db.Preload("Category").Where("user_id = ? AND year = ?", uint(userIDUint), year)

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
	// Update only specific fields to avoid relationship update issues
	// GORM will automatically update the updated_at timestamp
	result := r.db.Model(allocation).
		Where("id = ?", allocation.ID).
		Updates(map[string]interface{}{
			"total_days":     allocation.TotalDays,
			"used_days":      allocation.UsedDays,
			"remaining_days": allocation.RemainingDays,
		})

	if result.Error != nil {
		return fmt.Errorf("failed to update leave allocation: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("leave allocation not found or no changes made")
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
	// Convert string IDs to uint
	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	categoryIDUint, err := strconv.ParseUint(categoryID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid category ID: %w", err)
	}

	if err := r.db.Model(&models.LeaveAllocation{}).
		Where("user_id = ? AND category_id = ? AND year = ?", uint(userIDUint), uint(categoryIDUint), year).
		Update("used_days", days).Error; err != nil {
		return fmt.Errorf("failed to update used days: %w", err)
	}
	return nil
}

// buildQuery constructs a GORM query based on filters
func (r *leaveAllocationRepository) buildQuery(query *gorm.DB, filters map[string]interface{}) *gorm.DB {
	for key, value := range filters {
		switch key {
		case "user_id":
			if userIDStr, ok := value.(string); ok {
				if userIDUint, err := strconv.ParseUint(userIDStr, 10, 32); err == nil {
					query = query.Where("user_id = ?", uint(userIDUint))
				}
			}
		case "category_id":
			if categoryIDStr, ok := value.(string); ok {
				if categoryIDUint, err := strconv.ParseUint(categoryIDStr, 10, 32); err == nil {
					query = query.Where("category_id = ?", uint(categoryIDUint))
				}
			}
		case "year":
			if year, ok := value.(int); ok {
				query = query.Where("year = ?", year)
			}
		}
	}
	return query
}
