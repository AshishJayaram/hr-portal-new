package repositories

import (
	"fmt"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"

	"gorm.io/gorm"
)

// leaveRepository implements LeaveRepository interface
type leaveRepository struct {
	*BaseRepository
}

func (r *leaveRepository) Create(leave *models.Leave) error {
	if err := r.db.Create(leave).Error; err != nil {
		return fmt.Errorf("failed to create leave: %w", err)
	}
	return nil
}

func (r *leaveRepository) GetByID(id string) (*models.Leave, error) {
	var leave models.Leave
	if err := r.db.Preload("User").Preload("Category").Where("id = ?", id).First(&leave).Error; err != nil {
		return nil, fmt.Errorf("leave not found: %w", err)
	}
	return &leave, nil
}

func (r *leaveRepository) List(organizationID string, filters map[string]interface{}) ([]models.Leave, error) {
	var leaves []models.Leave

	// Convert string organizationID to uint
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	query := r.db.Preload("User").Preload("Category").Where("organization_id = ?", uint(orgIDUint))
	query = r.buildQuery(query, filters)
	query = query.Order("created_at DESC")

	if err := query.Find(&leaves).Error; err != nil {
		return nil, fmt.Errorf("failed to list leaves: %w", err)
	}
	return leaves, nil
}

func (r *leaveRepository) ListPaginated(organizationID string, filters map[string]interface{}, page, perPage int) ([]models.Leave, int64, error) {
	var leaves []models.Leave
	var total int64

	// Convert string organizationID to uint
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, 0, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Build base query
	baseQuery := r.db.Model(&models.Leave{}).Where("organization_id = ?", uint(orgIDUint))
	baseQuery = r.buildQuery(baseQuery, filters)

	// Count total records
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count leaves: %w", err)
	}

	// Calculate offset
	offset := (page - 1) * perPage

	// Build paginated query with preloads
	query := r.db.Preload("User").Preload("Category").Where("organization_id = ?", uint(orgIDUint))
	query = r.buildQuery(query, filters)
	query = query.Offset(offset).Limit(perPage).Order("created_at DESC")

	if err := query.Find(&leaves).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list paginated leaves: %w", err)
	}

	return leaves, total, nil
}

func (r *leaveRepository) Update(leave *models.Leave) error {
	if err := r.db.Save(leave).Error; err != nil {
		return fmt.Errorf("failed to update leave: %w", err)
	}
	return nil
}

func (r *leaveRepository) Delete(id string) error {
	if err := r.db.Where("id = ?", id).Delete(&models.Leave{}).Error; err != nil {
		return fmt.Errorf("failed to delete leave: %w", err)
	}
	return nil
}

func (r *leaveRepository) GetByUserID(userID string, filters map[string]interface{}) ([]models.Leave, error) {
	var leaves []models.Leave

	// Convert string userID to uint
	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	query := r.db.Preload("User").Preload("Category").Where("user_id = ?", uint(userIDUint))
	query = r.buildQuery(query, filters)

	if err := query.Find(&leaves).Error; err != nil {
		return nil, fmt.Errorf("failed to get user leaves: %w", err)
	}
	return leaves, nil
}

func (r *leaveRepository) GetPendingApprovals(managerID string) ([]models.Leave, error) {
	var leaves []models.Leave
	if err := r.db.Preload("User").Preload("Category").
		Where("status = ? AND approver_id = ?", "pending", managerID).
		Find(&leaves).Error; err != nil {
		return nil, fmt.Errorf("failed to get pending approvals: %w", err)
	}
	return leaves, nil
}

func (r *leaveRepository) Approve(id, approverID string) error {
	// Convert approverID string to uint (since user IDs are now integers)
	approverIDUint, err := strconv.ParseUint(approverID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid approver ID: %w", err)
	}

	now := time.Now()
	if err := r.db.Model(&models.Leave{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":      "approved",
			"approved_by": uint(approverIDUint),
			"approved_at": now,
		}).Error; err != nil {
		return fmt.Errorf("failed to approve leave: %w", err)
	}
	return nil
}

func (r *leaveRepository) Reject(id, rejecterID, reason string) error {
	// Convert rejecterID string to uint (since user IDs are now integers)
	rejecterIDUint, err := strconv.ParseUint(rejecterID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid rejecter ID: %w", err)
	}

	now := time.Now()
	if err := r.db.Model(&models.Leave{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":           "rejected",
			"rejected_by":      uint(rejecterIDUint),
			"rejected_at":      now,
			"rejection_reason": reason,
		}).Error; err != nil {
		return fmt.Errorf("failed to reject leave: %w", err)
	}
	return nil
}

func (r *leaveRepository) Count(count *int64) error {
	if err := r.db.Model(&models.Leave{}).Count(count).Error; err != nil {
		return fmt.Errorf("failed to count leaves: %w", err)
	}
	return nil
}

func (r *leaveRepository) CountByOrganization(organizationID string, count *int64) error {
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid organization ID: %w", err)
	}
	if err := r.db.Model(&models.Leave{}).Where("organization_id = ?", uint(orgIDUint)).Count(count).Error; err != nil {
		return fmt.Errorf("failed to count leaves by organization: %w", err)
	}
	return nil
}

func (r *leaveRepository) CountPendingByOrganization(organizationID string, count *int64) error {
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid organization ID: %w", err)
	}
	if err := r.db.Model(&models.Leave{}).Where("organization_id = ? AND status = ?", uint(orgIDUint), "pending").Count(count).Error; err != nil {
		return fmt.Errorf("failed to count pending leaves by organization: %w", err)
	}
	return nil
}

func (r *leaveRepository) CountApprovedByOrganization(organizationID string, count *int64) error {
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid organization ID: %w", err)
	}
	
	// Get current month's start and end dates
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	endOfMonth := startOfMonth.AddDate(0, 1, -1).Add(23*time.Hour + 59*time.Minute + 59*time.Second)
	
	if err := r.db.Model(&models.Leave{}).
		Where("organization_id = ? AND status = ? AND approved_at >= ? AND approved_at <= ?", 
			uint(orgIDUint), "approved", startOfMonth, endOfMonth).
		Count(count).Error; err != nil {
		return fmt.Errorf("failed to count approved leaves by organization for this month: %w", err)
	}
	return nil
}

func (r *leaveRepository) GetUserLeaves(userID string, year int) ([]models.Leave, error) {
	var leaves []models.Leave
	startOfYear := fmt.Sprintf("%d-01-01", year)
	endOfYear := fmt.Sprintf("%d-12-31", year)

	// Convert string userID to uint
	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	if err := r.db.Preload("User").Preload("Category").
		Where("user_id = ? AND from_date >= ? AND to_date <= ?", uint(userIDUint), startOfYear, endOfYear).
		Find(&leaves).Error; err != nil {
		return nil, fmt.Errorf("failed to get user leaves: %w", err)
	}
	return leaves, nil
}

// GetTeamLeaves returns all leave requests for users who report to the given manager (direct reports only)
func (r *leaveRepository) GetTeamLeaves(managerID string, organizationID string, filters map[string]interface{}) ([]models.Leave, error) {
	var leaves []models.Leave

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

	// Build query to get leaves for all subordinates of the manager
	query := r.db.Preload("User").Preload("Category").
		Joins("JOIN users ON leaves.user_id = users.id").
		Where("users.manager_id = ? AND leaves.organization_id = ?", uint(managerIDUint), uint(orgIDUint))

	// Apply additional filters
	query = r.buildQuery(query, filters)
	query = query.Order("created_at DESC")

	if err := query.Find(&leaves).Error; err != nil {
		return nil, fmt.Errorf("failed to get team leaves: %w", err)
	}
	return leaves, nil
}

// GetTeamLeavesPaginated returns paginated leave requests for users who report to the given manager (direct reports only)
func (r *leaveRepository) GetTeamLeavesPaginated(managerID string, organizationID string, filters map[string]interface{}, page, perPage int) ([]models.Leave, int64, error) {
	var leaves []models.Leave
	var total int64

	// Convert string managerID to uint
	managerIDUint, err := strconv.ParseUint(managerID, 10, 32)
	if err != nil {
		return nil, 0, fmt.Errorf("invalid manager ID: %w", err)
	}

	// Convert string organizationID to uint
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, 0, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Build base query for counting
	baseQuery := r.db.Model(&models.Leave{}).
		Joins("JOIN users ON leaves.user_id = users.id").
		Where("users.manager_id = ? AND leaves.organization_id = ?", uint(managerIDUint), uint(orgIDUint))

	// Apply additional filters to base query
	baseQuery = r.buildQuery(baseQuery, filters)

	// Count total records
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count team leaves: %w", err)
	}

	// Calculate offset
	offset := (page - 1) * perPage

	// Build paginated query with preloads
	query := r.db.Preload("User").Preload("Category").
		Joins("JOIN users ON leaves.user_id = users.id").
		Where("users.manager_id = ? AND leaves.organization_id = ?", uint(managerIDUint), uint(orgIDUint))

	// Apply additional filters
	query = r.buildQuery(query, filters)
	query = query.Offset(offset).Limit(perPage).Order("leaves.created_at DESC")

	if err := query.Find(&leaves).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to get paginated team leaves: %w", err)
	}

	return leaves, total, nil
}

// GetTeamLeavesRecursive returns all leave requests for users who report to the given manager (including sub-reports)
func (r *leaveRepository) GetTeamLeavesRecursive(managerID string, organizationID string, filters map[string]interface{}) ([]models.Leave, error) {
	var leaves []models.Leave

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
		return leaves, nil // No subordinates
	}

	// Build query to get leaves for all subordinates
	query := r.db.Preload("User").Preload("Category").
		Where("user_id IN ? AND organization_id = ?", subordinateIDs, uint(orgIDUint))

	// Apply additional filters
	query = r.buildQuery(query, filters)
	query = query.Order("created_at DESC")

	if err := query.Find(&leaves).Error; err != nil {
		return nil, fmt.Errorf("failed to get team leaves: %w", err)
	}
	return leaves, nil
}

// GetTeamLeavesRecursivePaginated returns paginated leave requests for users who report to the given manager (including sub-reports)
func (r *leaveRepository) GetTeamLeavesRecursivePaginated(managerID string, organizationID string, filters map[string]interface{}, page, perPage int) ([]models.Leave, int64, error) {
	var leaves []models.Leave
	var total int64

	// Convert string managerID to uint
	managerIDUint, err := strconv.ParseUint(managerID, 10, 32)
	if err != nil {
		return nil, 0, fmt.Errorf("invalid manager ID: %w", err)
	}

	// Convert string organizationID to uint
	orgIDUint, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, 0, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Get all subordinate user IDs recursively
	subordinateIDs, err := r.getAllSubordinateIDs(uint(managerIDUint), uint(orgIDUint))
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get subordinate IDs: %w", err)
	}

	if len(subordinateIDs) == 0 {
		return leaves, 0, nil // No subordinates
	}

	// Build base query for counting
	baseQuery := r.db.Model(&models.Leave{}).
		Where("user_id IN ? AND organization_id = ?", subordinateIDs, uint(orgIDUint))

	// Apply additional filters to base query
	baseQuery = r.buildQuery(baseQuery, filters)

	// Count total records
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count team leaves: %w", err)
	}

	// Calculate offset
	offset := (page - 1) * perPage

	// Build paginated query with preloads
	query := r.db.Preload("User").Preload("Category").
		Where("user_id IN ? AND organization_id = ?", subordinateIDs, uint(orgIDUint))

	// Apply additional filters
	query = r.buildQuery(query, filters)
	query = query.Offset(offset).Limit(perPage).Order("created_at DESC")

	if err := query.Find(&leaves).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to get paginated team leaves: %w", err)
	}

	return leaves, total, nil
}

// getAllSubordinateIDs recursively gets all subordinate user IDs for a given manager
func (r *leaveRepository) getAllSubordinateIDs(managerID, organizationID uint) ([]uint, error) {
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

func (r *leaveRepository) buildQuery(query *gorm.DB, filters map[string]interface{}) *gorm.DB {
	for key, value := range filters {
		switch key {
		case "user_id":
			// Convert string user_id to uint if it's a string
			if userIDStr, ok := value.(string); ok {
				if userIDUint, err := strconv.ParseUint(userIDStr, 10, 32); err == nil {
					query = query.Where("user_id = ?", uint(userIDUint))
				}
			} else {
				query = query.Where("user_id = ?", value)
			}
		case "status":
			query = query.Where("status = ?", value)
		case "category_id":
			// Convert string category_id to uint if it's a string
			if categoryIDStr, ok := value.(string); ok {
				if categoryIDUint, err := strconv.ParseUint(categoryIDStr, 10, 32); err == nil {
					query = query.Where("category_id = ?", uint(categoryIDUint))
				}
			} else {
				query = query.Where("category_id = ?", value)
			}
		case "from_date":
			query = query.Where("from_date >= ?", value)
		case "to_date":
			query = query.Where("to_date <= ?", value)
		}
	}
	return query
}

func (r *leaveRepository) FindOverlappingLeaves(userID string, fromDate, toDate time.Time) ([]models.Leave, error) {
	var leaves []models.Leave

	// Convert string userID to uint
	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	// Find overlapping leaves: existing from_date <= new to_date AND new from_date <= existing to_date
	// This covers all overlap scenarios (partial overlap, complete overlap, etc.)
	// Exclude cancelled/rejected leaves as they don't represent actual time off
	if err := r.db.Preload("Category").Where(
		"user_id = ? AND status IN ('pending', 'approved') AND "+
			"from_date <= ? AND to_date >= ?",
		uint(userIDUint),
		toDate, fromDate,
	).Find(&leaves).Error; err != nil {
		return nil, fmt.Errorf("failed to find overlapping leaves: %w", err)
	}

	return leaves, nil
}
