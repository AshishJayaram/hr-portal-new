package repositories

import (
	"fmt"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"

	"gorm.io/gorm"
)

// OffSiteRepository interface for off-site data access
type OffSiteRepository interface {
	Create(offSite *models.OffSite) error
	GetByID(id string) (*models.OffSite, error)
	List(organizationID string, filters map[string]interface{}) ([]models.OffSite, error)
	ListByUser(userID string, filters map[string]interface{}) ([]models.OffSite, error)
	ListByManager(managerID string, organizationID string, filters map[string]interface{}) ([]models.OffSite, error)
	Update(offSite *models.OffSite) error
	Delete(id string) error
	GetByDateRange(organizationID string, startDate, endDate time.Time) ([]models.OffSite, error)
}

// offSiteRepository implements OffSiteRepository interface
type offSiteRepository struct {
	db *gorm.DB
}

// NewOffSiteRepository creates a new off-site repository
func NewOffSiteRepository(db *gorm.DB) OffSiteRepository {
	return &offSiteRepository{
		db: db,
	}
}

func (r *offSiteRepository) Create(offSite *models.OffSite) error {
	if err := r.db.Create(offSite).Error; err != nil {
		return fmt.Errorf("failed to create off-site: %w", err)
	}
	return nil
}

func (r *offSiteRepository) GetByID(id string) (*models.OffSite, error) {
	var offSite models.OffSite
	if err := r.db.Preload("User").Preload("Organization").
		Where("id = ?", id).First(&offSite).Error; err != nil {
		return nil, fmt.Errorf("failed to get off-site: %w", err)
	}
	return &offSite, nil
}

func (r *offSiteRepository) List(organizationID string, filters map[string]interface{}) ([]models.OffSite, error) {
	var offSites []models.OffSite

	// Convert string organizationID to uint
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	query := r.db.Preload("User").Preload("Organization").Where("organization_id = ?", uint(orgIDUint))
	query = r.buildQuery(query, filters)
	query = query.Order("start_date DESC")

	if err := query.Find(&offSites).Error; err != nil {
		return nil, fmt.Errorf("failed to list off-sites: %w", err)
	}
	return offSites, nil
}

func (r *offSiteRepository) ListByUser(userID string, filters map[string]interface{}) ([]models.OffSite, error) {
	var offSites []models.OffSite

	// Convert string userID to uint
	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	query := r.db.Preload("User").Preload("Organization").Where("user_id = ?", uint(userIDUint))
	query = r.buildQuery(query, filters)
	query = query.Order("start_date DESC")

	if err := query.Find(&offSites).Error; err != nil {
		return nil, fmt.Errorf("failed to list user off-sites: %w", err)
	}
	return offSites, nil
}

func (r *offSiteRepository) ListByManager(managerID string, organizationID string, filters map[string]interface{}) ([]models.OffSite, error) {
	var offSites []models.OffSite

	// Convert string managerID to uint
	managerIDUint, err := strconv.ParseUint(managerID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid manager ID: %w", err)
	}

	// Convert string organizationID to uint
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Get all subordinate user IDs recursively
	subordinateIDs, err := r.getAllSubordinateIDs(uint(managerIDUint), uint(orgIDUint))
	if err != nil {
		return nil, fmt.Errorf("failed to get subordinate IDs: %w", err)
	}

	if len(subordinateIDs) == 0 {
		return offSites, nil // No subordinates
	}

	// Build query to get off-sites for all subordinates
	query := r.db.Preload("User").Preload("Organization").
		Where("user_id IN ? AND organization_id = ?", subordinateIDs, uint(orgIDUint))

	// Apply additional filters
	query = r.buildQuery(query, filters)
	query = query.Order("start_date DESC")

	if err := query.Find(&offSites).Error; err != nil {
		return nil, fmt.Errorf("failed to get manager off-sites: %w", err)
	}
	return offSites, nil
}

// getAllSubordinateIDs recursively gets all subordinate user IDs for a given manager
func (r *offSiteRepository) getAllSubordinateIDs(managerID, organizationID uint) ([]uint, error) {
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

func (r *offSiteRepository) Update(offSite *models.OffSite) error {
	if err := r.db.Save(offSite).Error; err != nil {
		return fmt.Errorf("failed to update off-site: %w", err)
	}
	return nil
}

func (r *offSiteRepository) Delete(id string) error {
	if err := r.db.Delete(&models.OffSite{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete off-site: %w", err)
	}
	return nil
}

func (r *offSiteRepository) GetByDateRange(organizationID string, startDate, endDate time.Time) ([]models.OffSite, error) {
	var offSites []models.OffSite

	// Convert string organizationID to uint
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	query := r.db.Preload("User").Preload("Organization").
		Where("organization_id = ? AND start_date <= ? AND end_date >= ?", uint(orgIDUint), endDate, startDate).
		Order("start_date ASC")

	if err := query.Find(&offSites).Error; err != nil {
		return nil, fmt.Errorf("failed to get off-sites by date range: %w", err)
	}
	return offSites, nil
}

func (r *offSiteRepository) buildQuery(query *gorm.DB, filters map[string]interface{}) *gorm.DB {
	for key, value := range filters {
		switch key {
		case "user_id":
			if userIDStr, ok := value.(string); ok {
				if userIDUint, err := strconv.ParseUint(userIDStr, 10, 32); err == nil {
					query = query.Where("user_id = ?", uint(userIDUint))
				}
			}
		case "type":
			if typeStr, ok := value.(string); ok {
				query = query.Where("type = ?", typeStr)
			}
		case "status":
			if statusStr, ok := value.(string); ok {
				query = query.Where("status = ?", statusStr)
			}
		case "start_date":
			if startDate, ok := value.(time.Time); ok {
				query = query.Where("start_date >= ?", startDate)
			}
		case "end_date":
			if endDate, ok := value.(time.Time); ok {
				query = query.Where("end_date <= ?", endDate)
			}
		case "month":
			if month, ok := value.(int); ok {
				query = query.Where("strftime('%m', start_date) = ?", fmt.Sprintf("%02d", month))
			}
		case "year":
			if year, ok := value.(int); ok {
				query = query.Where("strftime('%Y', start_date) = ?", fmt.Sprintf("%d", year))
			}
		}
	}
	return query
}
