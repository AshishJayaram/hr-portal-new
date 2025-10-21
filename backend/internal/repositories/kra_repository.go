package repositories

import (
	"fmt"
	"strconv"

	"hr-portal-backend/internal/models"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// KRARepository interface for KRA operations
type KRARepository interface {
	Create(kra *models.KRA) error
	GetByID(id string) (*models.KRA, error)
	GetByUserAndYear(userID, organizationID string, year int) ([]models.KRA, error)
	GetByUser(userID, organizationID string) ([]models.KRA, error)
	GetByManager(managerID, organizationID string, year int) ([]models.KRA, error)
	Update(kra *models.KRA) error
	Delete(id string) error
	List(organizationID string, filters map[string]interface{}) ([]models.KRA, error)
	GetTeamKRAs(managerID, organizationID string, year int) ([]models.KRA, error)
	GetReporteesKRAs(managerID, organizationID string, year int) ([]models.KRA, error)
}

type kraRepository struct {
	*BaseRepository
}

// NewKRARepository creates a new KRA repository
func NewKRARepository(db *gorm.DB, rdb *redis.Client) KRARepository {
	return &kraRepository{
		BaseRepository: NewBaseRepository(db, rdb),
	}
}

// Create creates a new KRA
func (r *kraRepository) Create(kra *models.KRA) error {
	// Explicitly set ID to 0 to ensure auto-increment
	kra.ID = 0
	return r.db.Create(kra).Error
}

// GetByID retrieves a KRA by ID
func (r *kraRepository) GetByID(id string) (*models.KRA, error) {
	var kra models.KRA
	if err := r.db.Preload("User").Preload("Organization").Preload("SetByUser").Preload("Evaluator").
		Where("id = ?", id).First(&kra).Error; err != nil {
		return nil, fmt.Errorf("KRA not found: %w", err)
	}
	return &kra, nil
}

// GetByUserAndYear retrieves KRAs for a specific user and year
func (r *kraRepository) GetByUserAndYear(userID, organizationID string, year int) ([]models.KRA, error) {
	var kras []models.KRA

	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	if err := r.db.Preload("User").Preload("SetByUser").Preload("Evaluator").
		Where("user_id = ? AND organization_id = ? AND year = ?", uint(userIDUint), uint(orgIDUint), year).
		Order("created_at DESC").Find(&kras).Error; err != nil {
		return nil, fmt.Errorf("failed to get KRAs: %w", err)
	}
	return kras, nil
}

// GetByUser retrieves all KRAs for a specific user
func (r *kraRepository) GetByUser(userID, organizationID string) ([]models.KRA, error) {
	var kras []models.KRA

	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	if err := r.db.Preload("User").Preload("SetByUser").Preload("Evaluator").
		Where("user_id = ? AND organization_id = ?", uint(userIDUint), uint(orgIDUint)).
		Order("year DESC, created_at DESC").Find(&kras).Error; err != nil {
		return nil, fmt.Errorf("failed to get user KRAs: %w", err)
	}
	return kras, nil
}

// GetByManager retrieves KRAs for all users managed by a specific manager
func (r *kraRepository) GetByManager(managerID, organizationID string, year int) ([]models.KRA, error) {
	var kras []models.KRA

	managerIDUint, err := strconv.ParseUint(managerID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid manager ID: %w", err)
	}

	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Get all subordinate user IDs
	subordinateIDs, err := r.getAllSubordinateIDs(uint(managerIDUint), uint(orgIDUint))
	if err != nil {
		return nil, fmt.Errorf("failed to get subordinate IDs: %w", err)
	}

	if len(subordinateIDs) == 0 {
		return kras, nil // No subordinates
	}

	if err := r.db.Preload("User").Preload("SetByUser").Preload("Evaluator").
		Where("user_id IN ? AND organization_id = ? AND year = ?", subordinateIDs, uint(orgIDUint), year).
		Order("user_id, created_at DESC").Find(&kras).Error; err != nil {
		return nil, fmt.Errorf("failed to get manager KRAs: %w", err)
	}
	return kras, nil
}

// GetTeamKRAs retrieves KRAs for all team members (direct and indirect reports)
func (r *kraRepository) GetTeamKRAs(managerID, organizationID string, year int) ([]models.KRA, error) {
	return r.GetByManager(managerID, organizationID, year)
}

// GetReporteesKRAs retrieves KRAs for all direct reportees of a manager
func (r *kraRepository) GetReporteesKRAs(managerID, organizationID string, year int) ([]models.KRA, error) {
	var kras []models.KRA

	managerIDUint, err := strconv.ParseUint(managerID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid manager ID: %w", err)
	}

	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Get only direct subordinate user IDs (not recursive)
	var subordinateIDs []uint
	if err := r.db.Model(&models.User{}).
		Where("manager_id = ? AND organization_id = ?", uint(managerIDUint), uint(orgIDUint)).
		Pluck("id", &subordinateIDs).Error; err != nil {
		return nil, fmt.Errorf("failed to get subordinate IDs: %w", err)
	}

	// Debug logging for Herbert Raj issue
	fmt.Printf("DEBUG: Manager ID %d (org %d) has %d direct subordinates: %v\n", 
		uint(managerIDUint), uint(orgIDUint), len(subordinateIDs), subordinateIDs)

	if len(subordinateIDs) == 0 {
		return kras, nil // No direct subordinates
	}

	if err := r.db.Preload("User").Preload("SetByUser").Preload("Evaluator").Preload("EmployeeRater").
		Where("user_id IN ? AND organization_id = ? AND year = ?", subordinateIDs, uint(orgIDUint), year).
		Order("user_id, created_at DESC").Find(&kras).Error; err != nil {
		return nil, fmt.Errorf("failed to get reportees KRAs: %w", err)
	}
	return kras, nil
}

// Update updates an existing KRA
func (r *kraRepository) Update(kra *models.KRA) error {
	return r.db.Save(kra).Error
}

// Delete deletes a KRA
func (r *kraRepository) Delete(id string) error {
	return r.db.Where("id = ?", id).Delete(&models.KRA{}).Error
}

// List returns all KRAs for an organization with optional filters
func (r *kraRepository) List(organizationID string, filters map[string]interface{}) ([]models.KRA, error) {
	var kras []models.KRA
	query := r.db.Preload("User").Preload("SetByUser").Preload("Evaluator")

	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}
	query = query.Where("organization_id = ?", uint(orgIDUint))

	query = r.buildQuery(query, filters)
	query = query.Order("year DESC, user_id, created_at DESC")

	if err := query.Find(&kras).Error; err != nil {
		return nil, fmt.Errorf("failed to list KRAs: %w", err)
	}
	return kras, nil
}

// buildQuery constructs a GORM query based on filters
func (r *kraRepository) buildQuery(query *gorm.DB, filters map[string]interface{}) *gorm.DB {
	for key, value := range filters {
		switch key {
		case "user_id":
			if userIDStr, ok := value.(string); ok {
				if userIDUint, err := strconv.ParseUint(userIDStr, 10, 32); err == nil {
					query = query.Where("user_id = ?", uint(userIDUint))
				}
			}
		case "year":
			if year, ok := value.(int); ok {
				query = query.Where("year = ?", year)
			}
		case "status":
			if status, ok := value.(string); ok && status != "" {
				query = query.Where("status = ?", status)
			}
		case "set_by":
			if setByStr, ok := value.(string); ok {
				if setByUint, err := strconv.ParseUint(setByStr, 10, 32); err == nil {
					query = query.Where("set_by = ?", uint(setByUint))
				}
			}
		case "evaluated":
			if evaluated, ok := value.(bool); ok {
				if evaluated {
					query = query.Where("evaluated_at IS NOT NULL")
				} else {
					query = query.Where("evaluated_at IS NULL")
				}
			}
		case "search":
			if search, ok := value.(string); ok && search != "" {
				query = query.Where("title LIKE ? OR description LIKE ?", "%"+search+"%", "%"+search+"%")
			}
		}
	}
	return query
}

// getAllSubordinateIDs recursively gets all subordinate user IDs for a manager
func (r *kraRepository) getAllSubordinateIDs(managerID, organizationID uint) ([]uint, error) {
	var subordinateIDs []uint

	// Get direct reports
	var directReports []models.User
	if err := r.db.Where("manager_id = ? AND organization_id = ?", managerID, organizationID).Find(&directReports).Error; err != nil {
		return nil, fmt.Errorf("failed to get direct reports: %w", err)
	}

	// Add direct reports to the list
	for _, user := range directReports {
		subordinateIDs = append(subordinateIDs, user.ID)

		// Recursively get sub-reports
		subReports, err := r.getAllSubordinateIDs(user.ID, organizationID)
		if err != nil {
			return nil, err
		}
		subordinateIDs = append(subordinateIDs, subReports...)
	}

	return subordinateIDs, nil
}
