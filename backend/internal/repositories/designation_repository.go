package repositories

import (
	"fmt"

	"hr-portal-backend/internal/models"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// designationRepository implements DesignationRepository interface
type designationRepository struct {
	*BaseRepository
}

// NewDesignationRepository creates a new designation repository
func NewDesignationRepository(db *gorm.DB, rdb *redis.Client) DesignationRepository {
	return &designationRepository{
		BaseRepository: NewBaseRepository(db, rdb),
	}
}

func (r *designationRepository) Create(designation *models.Designation) error {
	if err := r.db.Create(designation).Error; err != nil {
		return fmt.Errorf("failed to create designation: %w", err)
	}
	r.invalidateCache("designations:*")
	return nil
}

func (r *designationRepository) GetByID(id string) (*models.Designation, error) {
	var designation models.Designation
	if err := r.db.Where("id = ?", id).First(&designation).Error; err != nil {
		return nil, fmt.Errorf("designation not found: %w", err)
	}
	return &designation, nil
}

func (r *designationRepository) List(organizationID string, filters map[string]interface{}) ([]models.Designation, error) {
	var designations []models.Designation
	query := r.db.Where("organization_id = ?", organizationID)

	// Apply filters
	if isActive, ok := filters["is_active"].(bool); ok {
		query = query.Where("is_active = ?", isActive)
	}

	if err := query.Order("name ASC").Find(&designations).Error; err != nil {
		return nil, fmt.Errorf("failed to list designations: %w", err)
	}
	return designations, nil
}

func (r *designationRepository) GetByName(organizationID, name string) (*models.Designation, error) {
	var designation models.Designation
	if err := r.db.Where("organization_id = ? AND name = ?", organizationID, name).First(&designation).Error; err != nil {
		return nil, fmt.Errorf("designation not found: %w", err)
	}
	return &designation, nil
}

func (r *designationRepository) Update(designation *models.Designation) error {
	if err := r.db.Save(designation).Error; err != nil {
		return fmt.Errorf("failed to update designation: %w", err)
	}
	r.invalidateCache("designations:*")
	return nil
}

func (r *designationRepository) Delete(id string) error {
	if err := r.db.Delete(&models.Designation{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete designation: %w", err)
	}
	r.invalidateCache("designations:*")
	return nil
}

