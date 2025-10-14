package repositories

import (
	"fmt"
	"strconv"

	"hr-portal-backend/internal/models"

	"gorm.io/gorm"
)

type lopTrackingRepository struct {
	*BaseRepository
}

// Create creates a new LOP tracking record
func (r *lopTrackingRepository) Create(tracking *models.LOPTracking) error {
	return r.db.Create(tracking).Error
}

// GetByID retrieves LOP tracking by ID
func (r *lopTrackingRepository) GetByID(id string) (*models.LOPTracking, error) {
	var tracking models.LOPTracking
	err := r.db.Preload("User").Preload("Organization").First(&tracking, id).Error
	if err != nil {
		return nil, err
	}
	return &tracking, nil
}

// GetByUserAndYear retrieves LOP tracking for a specific user and year
func (r *lopTrackingRepository) GetByUserAndYear(userID, organizationID string, year int) (*models.LOPTracking, error) {
	var tracking models.LOPTracking

	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	err = r.db.Where("user_id = ? AND organization_id = ? AND year = ?",
		uint(userIDUint), uint(orgIDUint), year).First(&tracking).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create a new LOP tracking record if it doesn't exist
			tracking = models.LOPTracking{
				UserID:         uint(userIDUint),
				OrganizationID: uint(orgIDUint),
				Year:           year,
				TotalLOPDays:   0,
			}
			err = r.db.Create(&tracking).Error
			if err != nil {
				return nil, fmt.Errorf("failed to create LOP tracking: %w", err)
			}
		} else {
			return nil, fmt.Errorf("failed to get LOP tracking: %w", err)
		}
	}

	return &tracking, nil
}

// Update updates an existing LOP tracking record
func (r *lopTrackingRepository) Update(tracking *models.LOPTracking) error {
	return r.db.Save(tracking).Error
}

// UpdateLOPDays updates the LOP days for a specific user and year
func (r *lopTrackingRepository) UpdateLOPDays(userID, organizationID string, year int, lopDays int) error {
	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid organization ID: %w", err)
	}

	// First, try to get existing record
	var tracking models.LOPTracking
	err = r.db.Where("user_id = ? AND organization_id = ? AND year = ?",
		uint(userIDUint), uint(orgIDUint), year).First(&tracking).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create new record
			tracking = models.LOPTracking{
				UserID:         uint(userIDUint),
				OrganizationID: uint(orgIDUint),
				Year:           year,
				TotalLOPDays:   lopDays,
			}
			return r.db.Create(&tracking).Error
		}
		return fmt.Errorf("failed to get LOP tracking: %w", err)
	}

	// Update existing record
	tracking.TotalLOPDays = lopDays
	return r.db.Save(&tracking).Error
}

// List retrieves LOP tracking records with filters
func (r *lopTrackingRepository) List(organizationID string, filters map[string]interface{}) ([]models.LOPTracking, error) {
	var trackings []models.LOPTracking

	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	query := r.db.Where("organization_id = ?", uint(orgIDUint))

	// Apply filters
	if userID, exists := filters["user_id"]; exists {
		userIDUint, err := strconv.ParseUint(userID.(string), 10, 32)
		if err != nil {
			return nil, fmt.Errorf("invalid user ID: %w", err)
		}
		query = query.Where("user_id = ?", uint(userIDUint))
	}

	if year, exists := filters["year"]; exists {
		query = query.Where("year = ?", year)
	}

	err = query.Preload("User").Preload("Organization").Find(&trackings).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list LOP tracking: %w", err)
	}

	return trackings, nil
}
