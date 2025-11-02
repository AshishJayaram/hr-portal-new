package repositories

import (
	"fmt"

	"hr-portal-backend/internal/models"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// departmentRepository implements DepartmentRepository interface
type departmentRepository struct {
	*BaseRepository
}

// NewDepartmentRepository creates a new department repository
func NewDepartmentRepository(db *gorm.DB, rdb *redis.Client) DepartmentRepository {
	return &departmentRepository{
		BaseRepository: NewBaseRepository(db, rdb),
	}
}

func (r *departmentRepository) Create(department *models.Department) error {
	if err := r.db.Create(department).Error; err != nil {
		return fmt.Errorf("failed to create department: %w", err)
	}
	r.invalidateCache("departments:*")
	return nil
}

func (r *departmentRepository) GetByID(id string) (*models.Department, error) {
	var department models.Department
	if err := r.db.Where("id = ?", id).First(&department).Error; err != nil {
		return nil, fmt.Errorf("department not found: %w", err)
	}
	return &department, nil
}

func (r *departmentRepository) List(organizationID string, filters map[string]interface{}) ([]models.Department, error) {
	var departments []models.Department
	query := r.db.Where("organization_id = ?", organizationID)

	// Apply filters
	if isActive, ok := filters["is_active"].(bool); ok {
		query = query.Where("is_active = ?", isActive)
	}

	if err := query.Order("name ASC").Find(&departments).Error; err != nil {
		return nil, fmt.Errorf("failed to list departments: %w", err)
	}
	return departments, nil
}

func (r *departmentRepository) GetByName(organizationID, name string) (*models.Department, error) {
	var department models.Department
	if err := r.db.Where("organization_id = ? AND name = ?", organizationID, name).First(&department).Error; err != nil {
		return nil, fmt.Errorf("department not found: %w", err)
	}
	return &department, nil
}

func (r *departmentRepository) Update(department *models.Department) error {
	if err := r.db.Save(department).Error; err != nil {
		return fmt.Errorf("failed to update department: %w", err)
	}
	r.invalidateCache("departments:*")
	return nil
}

func (r *departmentRepository) Delete(id string) error {
	if err := r.db.Delete(&models.Department{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete department: %w", err)
	}
	r.invalidateCache("departments:*")
	return nil
}

