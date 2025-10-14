package services

import (
	"fmt"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

// LOPService handles LOP (Loss of Pay) tracking and spillover logic
type LOPService interface {
	GetLOPTracking(userID, organizationID string, year int) (*models.LOPTracking, error)
	UpdateLOPTracking(userID, organizationID string, year int, lopDays int) error
	CalculateSpillover(userID, organizationID, categoryID string, requestedDays float64) (*SpilloverResult, error)
	ProcessLeaveWithSpillover(req ApplyLeaveRequest) (*models.Leave, error)
}

type lopService struct {
	lopRepo        repositories.LOPTrackingRepository
	leaveRepo      repositories.LeaveRepository
	allocationRepo repositories.LeaveAllocationRepository
	categoryRepo   repositories.LeaveCategoryRepository
}

type SpilloverResult struct {
	PrimaryCategoryDays   float64 `json:"primary_category_days"`
	SpilloverCategoryID   *uint   `json:"spillover_category_id"`
	SpilloverCategoryName string  `json:"spillover_category_name"`
	SpilloverDays         float64 `json:"spillover_days"`
	LOPDays               int     `json:"lop_days"`
	TotalDays             float64 `json:"total_days"`
}

func NewLOPService(repos *repositories.Repositories) LOPService {
	return &lopService{
		lopRepo:        repos.LOPTracking,
		leaveRepo:      repos.Leave,
		allocationRepo: repos.LeaveAllocation,
		categoryRepo:   repos.LeaveCategory,
	}
}

// GetLOPTracking retrieves LOP tracking for a user
func (s *lopService) GetLOPTracking(userID, organizationID string, year int) (*models.LOPTracking, error) {
	return s.lopRepo.GetByUserAndYear(userID, organizationID, year)
}

// UpdateLOPTracking updates LOP tracking for a user
func (s *lopService) UpdateLOPTracking(userID, organizationID string, year int, lopDays int) error {
	return s.lopRepo.UpdateLOPDays(userID, organizationID, year, lopDays)
}

// CalculateSpillover calculates how leave days should be distributed across categories and LOP
func (s *lopService) CalculateSpillover(userID, organizationID, categoryID string, requestedDays float64) (*SpilloverResult, error) {
	currentYear := time.Now().Year()

	// Get all leave allocations for the user
	allocations, err := s.allocationRepo.GetByUserID(userID, currentYear)
	if err != nil {
		return nil, fmt.Errorf("failed to get leave allocations: %w", err)
	}

	// Get all leave categories for the organization
	categories, err := s.categoryRepo.List(organizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get leave categories: %w", err)
	}

	// Create a map of category ID to category for easy lookup
	categoryMap := make(map[uint]*models.LeaveCategory)
	for _, cat := range categories {
		categoryMap[cat.ID] = &cat
	}

	// Create a map of category ID to allocation for easy lookup
	allocationMap := make(map[uint]*models.LeaveAllocation)
	for _, alloc := range allocations {
		allocationMap[alloc.CategoryID] = &alloc
	}

	// Parse the primary category ID
	primaryCategoryID, err := strconv.ParseUint(categoryID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid category ID: %w", err)
	}

	result := &SpilloverResult{
		TotalDays: requestedDays,
	}

	remainingDays := requestedDays

	// First, try to use the primary category
	if allocation, exists := allocationMap[uint(primaryCategoryID)]; exists {
		availableDays := float64(allocation.TotalDays - allocation.UsedDays)
		if availableDays > 0 {
			if remainingDays <= availableDays {
				// All days can be covered by primary category
				result.PrimaryCategoryDays = remainingDays
				remainingDays = 0
			} else {
				// Use all available days from primary category
				result.PrimaryCategoryDays = availableDays
				remainingDays -= availableDays
			}
		}
	}

	// If there are still remaining days, try spillover to other categories
	if remainingDays > 0 {
		// Find other categories with available balance (excluding primary category)
		for catID, allocation := range allocationMap {
			if catID == uint(primaryCategoryID) {
				continue // Skip primary category as it's already processed
			}

			availableDays := float64(allocation.TotalDays - allocation.UsedDays)
			if availableDays > 0 && remainingDays > 0 {
				if remainingDays <= availableDays {
					// All remaining days can be covered by this category
					result.SpilloverCategoryID = &catID
					if category, exists := categoryMap[catID]; exists {
						result.SpilloverCategoryName = category.Name
					}
					result.SpilloverDays = remainingDays
					remainingDays = 0
					break
				} else {
					// Use all available days from this category
					result.SpilloverCategoryID = &catID
					if category, exists := categoryMap[catID]; exists {
						result.SpilloverCategoryName = category.Name
					}
					result.SpilloverDays = availableDays
					remainingDays -= availableDays
				}
			}
		}
	}

	// If there are still remaining days, they become LOP
	if remainingDays > 0 {
		result.LOPDays = int(remainingDays)
	}

	return result, nil
}

// ProcessLeaveWithSpillover processes a leave request with spillover logic
func (s *lopService) ProcessLeaveWithSpillover(req ApplyLeaveRequest) (*models.Leave, error) {
	// Calculate days from date range
	days := req.ToDate.Sub(req.FromDate).Hours()/24 + 1 // +1 to include both start and end dates

	// Calculate spillover
	spillover, err := s.CalculateSpillover(req.UserID, req.OrganizationID, req.CategoryID, days)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate spillover: %w", err)
	}

	// Create the leave record
	userID, err := strconv.ParseUint(req.UserID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	categoryID, err := strconv.ParseUint(req.CategoryID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid category ID: %w", err)
	}

	orgID, err := strconv.ParseUint(req.OrganizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	leave := &models.Leave{
		UserID:              uint(userID),
		CategoryID:          uint(categoryID),
		OrganizationID:      uint(orgID),
		Type:                req.Type,
		Reason:              req.Reason,
		FromDate:            req.FromDate,
		ToDate:              req.ToDate,
		Days:                days,
		StartHalf:           req.StartHalf,
		EndHalf:             req.EndHalf,
		Status:              "pending",
		LOPDays:             spillover.LOPDays,
		SpilloverCategoryID: spillover.SpilloverCategoryID,
		SpilloverDays:       int(spillover.SpilloverDays),
	}

	// Create the leave record
	err = s.leaveRepo.Create(leave)
	if err != nil {
		return nil, fmt.Errorf("failed to create leave: %w", err)
	}

	// Update leave allocations and LOP tracking if approved
	// This would typically be done when the leave is approved
	// For now, we'll just create the leave record

	return leave, nil
}
