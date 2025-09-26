package services

import (
	"fmt"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

// leaveService implements LeaveService interface
type leaveService struct {
	leaveRepo           repositories.LeaveRepository
	userRepo            repositories.UserRepository
	leaveCategoryRepo   repositories.LeaveCategoryRepository
	leaveAllocationRepo repositories.LeaveAllocationRepository
	holidayRepo         repositories.HolidayRepository
}

func NewLeaveService(leaveRepo repositories.LeaveRepository, userRepo repositories.UserRepository, leaveCategoryRepo repositories.LeaveCategoryRepository, leaveAllocationRepo repositories.LeaveAllocationRepository, holidayRepo repositories.HolidayRepository) LeaveService {
	return &leaveService{
		leaveRepo:           leaveRepo,
		userRepo:            userRepo,
		leaveCategoryRepo:   leaveCategoryRepo,
		leaveAllocationRepo: leaveAllocationRepo,
		holidayRepo:         holidayRepo,
	}
}

func (s *leaveService) ApplyLeave(req ApplyLeaveRequest) (*models.Leave, error) {
	// Validate dates
	if req.ToDate.Before(req.FromDate) {
		return nil, fmt.Errorf("end date cannot be before start date")
	}

	// Convert string IDs to uint
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

	// Get holidays for the organization to exclude from leave calculation
	holidays, err := s.holidayRepo.List(req.OrganizationID, map[string]interface{}{})
	if err != nil {
		return nil, fmt.Errorf("failed to get holidays: %w", err)
	}

	// Calculate days based on half day settings and holidays
	days := s.calculateLeaveDaysWithHolidays(req.FromDate, req.ToDate, req.StartHalf, req.EndHalf, holidays)

	// Check if user has sufficient leave balance (only for non-LOP leaves)
	if req.Type != "LOP" {
		currentYear := time.Now().Year()
		allocations, err := s.leaveAllocationRepo.GetByUserID(req.UserID, currentYear)
		if err != nil {
			return nil, fmt.Errorf("failed to get leave allocations: %w", err)
		}

		// Find allocation for this category
		var allocation *models.LeaveAllocation
		for _, alloc := range allocations {
			if alloc.CategoryID == uint(categoryID) {
				allocation = &alloc
				break
			}
		}

		if allocation == nil {
			return nil, fmt.Errorf("no leave allocation found for category %d", categoryID)
		}

		// Check if user has sufficient balance using allocation's used_days
		remainingDays := float64(allocation.TotalDays) - float64(allocation.UsedDays)
		if days > remainingDays {
			return nil, fmt.Errorf("insufficient leave balance: requested %.1f days, available %.1f days", days, remainingDays)
		}
	}

	// Set default half day values if not provided
	startHalf := req.StartHalf
	if startHalf == "" {
		startHalf = "FULL"
	}
	endHalf := req.EndHalf
	if endHalf == "" {
		endHalf = "FULL"
	}

	leave := &models.Leave{
		UserID:         uint(userID),
		CategoryID:     uint(categoryID),
		OrganizationID: uint(orgID),
		Type:           req.Type,
		Reason:         req.Reason,
		FromDate:       req.FromDate,
		ToDate:         req.ToDate,
		Days:           days,
		StartHalf:      startHalf,
		EndHalf:        endHalf,
		Status:         "pending",
	}

	err = s.leaveRepo.Create(leave)
	if err != nil {
		return nil, fmt.Errorf("failed to create leave: %w", err)
	}

	return leave, nil
}

func (s *leaveService) GetLeave(id string) (*models.Leave, error) {
	return s.leaveRepo.GetByID(id)
}

func (s *leaveService) ListLeaves(organizationID string, filters map[string]interface{}) ([]models.Leave, error) {
	return s.leaveRepo.List(organizationID, filters)
}

func (s *leaveService) ListLeavesPaginated(organizationID string, filters map[string]interface{}, page, perPage int) (*PaginatedResponse, error) {
	leaves, total, err := s.leaveRepo.ListPaginated(organizationID, filters, page, perPage)
	if err != nil {
		return nil, err
	}

	totalPages := int((total + int64(perPage) - 1) / int64(perPage))

	return &PaginatedResponse{
		Data:       leaves,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: totalPages,
	}, nil
}

func (s *leaveService) GetTeamLeaves(managerID string, organizationID string, filters map[string]interface{}) ([]models.Leave, error) {
	return s.leaveRepo.GetTeamLeaves(managerID, organizationID, filters)
}

func (s *leaveService) GetTeamLeavesPaginated(managerID string, organizationID string, filters map[string]interface{}, page, perPage int) (*PaginatedResponse, error) {
	leaves, total, err := s.leaveRepo.GetTeamLeavesPaginated(managerID, organizationID, filters, page, perPage)
	if err != nil {
		return nil, err
	}

	totalPages := int((total + int64(perPage) - 1) / int64(perPage))

	return &PaginatedResponse{
		Data:       leaves,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: totalPages,
	}, nil
}

func (s *leaveService) UpdateLeave(id string, req UpdateLeaveRequest) (*models.Leave, error) {
	// Get existing leave
	leave, err := s.leaveRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("leave not found: %w", err)
	}

	// Only allow updates to pending leaves
	if leave.Status != "pending" {
		return nil, fmt.Errorf("only pending leaves can be updated")
	}

	// Update fields if provided
	if req.Type != nil {
		leave.Type = *req.Type
	}
	if req.Reason != nil {
		leave.Reason = *req.Reason
	}
	if req.FromDate != nil {
		leave.FromDate = *req.FromDate
	}
	if req.ToDate != nil {
		leave.ToDate = *req.ToDate
	}
	if req.StartHalf != nil {
		leave.StartHalf = *req.StartHalf
	}
	if req.EndHalf != nil {
		leave.EndHalf = *req.EndHalf
	}
	if req.Status != nil {
		leave.Status = *req.Status
	}

	// Validate dates if they were updated
	if req.FromDate != nil || req.ToDate != nil {
		if leave.ToDate.Before(leave.FromDate) {
			return nil, fmt.Errorf("end date cannot be before start date")
		}

		// Recalculate days if dates or half-day settings changed
		if req.FromDate != nil || req.ToDate != nil || req.StartHalf != nil || req.EndHalf != nil {
			// Get holidays for the organization to exclude from leave calculation
			holidays, err := s.holidayRepo.List(fmt.Sprintf("%d", leave.OrganizationID), map[string]interface{}{})
			if err != nil {
				return nil, fmt.Errorf("failed to get holidays: %w", err)
			}

			// Calculate days based on half day settings and holidays
			leave.Days = s.calculateLeaveDaysWithHolidays(leave.FromDate, leave.ToDate, leave.StartHalf, leave.EndHalf, holidays)
		}
	}

	// Update the leave
	err = s.leaveRepo.Update(leave)
	if err != nil {
		return nil, fmt.Errorf("failed to update leave: %w", err)
	}

	return leave, nil
}

func (s *leaveService) ApproveLeave(id, approverID string) (*models.Leave, error) {
	// Get the leave record first
	leave, err := s.leaveRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("leave not found: %w", err)
	}

	// Only allow approval of pending leaves
	if leave.Status != "pending" {
		return nil, fmt.Errorf("only pending leaves can be approved")
	}

	// Check leave balance before approval (only for non-LOP leaves)
	if leave.Type != "LOP" {
		currentYear := time.Now().Year()

		// Get current allocation
		allocations, err := s.leaveAllocationRepo.GetByUserID(fmt.Sprintf("%d", leave.UserID), currentYear)
		if err != nil {
			return nil, fmt.Errorf("failed to get leave allocations: %w", err)
		}

		// Find allocation for this category
		var allocation *models.LeaveAllocation
		for _, alloc := range allocations {
			if alloc.CategoryID == leave.CategoryID {
				allocation = &alloc
				break
			}
		}

		if allocation == nil {
			return nil, fmt.Errorf("no leave allocation found for category %d", leave.CategoryID)
		}

		// Check if user has sufficient balance using allocation's used_days
		remainingDays := float64(allocation.TotalDays) - float64(allocation.UsedDays)
		if leave.Days > remainingDays {
			return nil, fmt.Errorf("insufficient leave balance: requested %.1f days, available %.1f days", leave.Days, remainingDays)
		}
	}

	// Approve the leave
	err = s.leaveRepo.Approve(id, approverID)
	if err != nil {
		return nil, err
	}

	// Deduct leave balance (only for non-LOP leaves)
	if leave.Type != "LOP" {
		currentYear := time.Now().Year()

		// Get current allocation
		allocations, err := s.leaveAllocationRepo.GetByUserID(fmt.Sprintf("%d", leave.UserID), currentYear)
		if err != nil {
			return nil, fmt.Errorf("failed to get leave allocations: %w", err)
		}

		// Find allocation for this category
		var allocation *models.LeaveAllocation
		for _, alloc := range allocations {
			if alloc.CategoryID == leave.CategoryID {
				allocation = &alloc
				break
			}
		}

		if allocation != nil {
			// Update used days
			newUsedDays := allocation.UsedDays + int(leave.Days)
			err = s.leaveAllocationRepo.UpdateUsedDays(fmt.Sprintf("%d", leave.UserID), fmt.Sprintf("%d", leave.CategoryID), currentYear, newUsedDays)
			if err != nil {
				return nil, fmt.Errorf("failed to update leave allocation: %w", err)
			}
		}
	}

	// Return the updated leave
	return s.leaveRepo.GetByID(id)
}

func (s *leaveService) RejectLeave(id, rejecterID, reason string) (*models.Leave, error) {
	// Get the leave record first
	leave, err := s.leaveRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("leave not found: %w", err)
	}

	// Only allow rejection of pending leaves
	if leave.Status != "pending" {
		return nil, fmt.Errorf("only pending leaves can be rejected")
	}

	// Reject the leave
	err = s.leaveRepo.Reject(id, rejecterID, reason)
	if err != nil {
		return nil, err
	}

	// No need to update leave balance for rejected leaves as they were never deducted

	// Return the updated leave
	return s.leaveRepo.GetByID(id)
}

func (s *leaveService) GetUserLeaves(userID string, filters map[string]interface{}) ([]models.Leave, error) {
	return s.leaveRepo.GetByUserID(userID, filters)
}

func (s *leaveService) GetPendingApprovals(managerID string) ([]models.Leave, error) {
	return s.leaveRepo.GetPendingApprovals(managerID)
}

func (s *leaveService) GetLeaveBalance(userID string) ([]LeaveBalanceResponse, error) {
	// Get user's leave allocations for current year
	currentYear := time.Now().Year()
	allocations, err := s.leaveAllocationRepo.GetByUserID(userID, currentYear)
	if err != nil {
		return nil, fmt.Errorf("failed to get leave allocations: %w", err)
	}

	// Calculate balance for each category using allocation's used_days
	var balances []LeaveBalanceResponse
	for _, allocation := range allocations {
		balance := LeaveBalanceResponse{
			CategoryID:    fmt.Sprintf("%d", allocation.CategoryID),
			CategoryName:  allocation.CategoryName,
			TotalDays:     allocation.TotalDays,
			UsedDays:      allocation.UsedDays,
			RemainingDays: allocation.TotalDays - allocation.UsedDays,
		}
		balances = append(balances, balance)
	}

	return balances, nil
}

func (s *leaveService) CancelLeave(id, userID string) (*models.Leave, error) {
	// Get the leave record
	leave, err := s.leaveRepo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("leave not found: %w", err)
	}

	// Check if user owns this leave
	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	if leave.UserID != uint(userIDUint) {
		return nil, fmt.Errorf("unauthorized: user does not own this leave")
	}

	// Check if leave can be cancelled (only pending leaves can be cancelled)
	if leave.Status != "pending" {
		return nil, fmt.Errorf("only pending leaves can be cancelled")
	}

	// Update status to cancelled
	leave.Status = "cancelled"
	err = s.leaveRepo.Update(leave)
	if err != nil {
		return nil, fmt.Errorf("failed to cancel leave: %w", err)
	}

	// No need to update leave balance for cancelled leaves as they were never deducted

	return leave, nil
}

// leaveCategoryService implements LeaveCategoryService interface
type leaveCategoryService struct {
	repo repositories.LeaveCategoryRepository
}

func NewLeaveCategoryService(repo repositories.LeaveCategoryRepository) LeaveCategoryService {
	return &leaveCategoryService{
		repo: repo,
	}
}

func (s *leaveCategoryService) CreateCategory(organizationID string, req CreateLeaveCategoryRequest) (*models.LeaveCategory, error) {
	// Parse organization ID from string to uint
	orgID, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	category := &models.LeaveCategory{
		OrganizationID:   uint(orgID),
		Name:             req.Name,
		Description:      req.Description,
		MaxDaysPerYear:   req.MaxDaysPerYear,
		RequiresApproval: req.RequiresApproval,
		IsActive:         true, // Default to active
	}

	err = s.repo.Create(category)
	if err != nil {
		return nil, err
	}
	return category, nil
}

func (s *leaveCategoryService) GetCategory(id string) (*models.LeaveCategory, error) {
	return s.repo.GetByID(id)
}

func (s *leaveCategoryService) ListCategories(organizationID string) ([]models.LeaveCategory, error) {
	return s.repo.List(organizationID)
}

func (s *leaveCategoryService) UpdateCategory(id string, req UpdateLeaveCategoryRequest) (*models.LeaveCategory, error) {
	// Get existing category first
	existing, err := s.repo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get category: %w", err)
	}

	// Update fields if provided
	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.Description != nil {
		existing.Description = *req.Description
	}
	if req.MaxDaysPerYear != nil {
		existing.MaxDaysPerYear = *req.MaxDaysPerYear
	}
	if req.RequiresApproval != nil {
		existing.RequiresApproval = *req.RequiresApproval
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}

	err = s.repo.Update(existing)
	if err != nil {
		return nil, err
	}
	return existing, nil
}

func (s *leaveCategoryService) DeleteCategory(id string) error {
	return s.repo.Delete(id)
}

// leaveAllocationService implements LeaveAllocationService interface
type leaveAllocationService struct {
	allocationRepo repositories.LeaveAllocationRepository
	categoryRepo   repositories.LeaveCategoryRepository
}

func NewLeaveAllocationService(allocationRepo repositories.LeaveAllocationRepository, categoryRepo repositories.LeaveCategoryRepository) LeaveAllocationService {
	return &leaveAllocationService{
		allocationRepo: allocationRepo,
		categoryRepo:   categoryRepo,
	}
}

func (s *leaveAllocationService) CreateAllocation(req CreateLeaveAllocationRequest) (*models.LeaveAllocation, error) {
	// Convert string IDs to uint
	userID, err := strconv.ParseUint(req.UserID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	categoryID, err := strconv.ParseUint(req.CategoryID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid category ID: %w", err)
	}

	organizationID, err := strconv.ParseUint(req.OrganizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Create the allocation
	allocation := &models.LeaveAllocation{
		UserID:         uint(userID),
		CategoryID:     uint(categoryID),
		OrganizationID: uint(organizationID),
		CategoryName:   req.CategoryName,
		TotalDays:      req.TotalDays,
		UsedDays:       0,
		RemainingDays:  req.TotalDays,
		Year:           req.Year,
	}

	err = s.allocationRepo.Create(allocation)
	if err != nil {
		return nil, fmt.Errorf("failed to create leave allocation: %w", err)
	}

	return allocation, nil
}

func (s *leaveAllocationService) GetAllocation(id string) (*models.LeaveAllocation, error) {
	return s.allocationRepo.GetByID(id)
}

func (s *leaveAllocationService) ListAllocations(organizationID string, filters map[string]interface{}) ([]models.LeaveAllocation, error) {
	return s.allocationRepo.List(organizationID, filters)
}

func (s *leaveAllocationService) UpdateAllocation(id string, req UpdateLeaveAllocationRequest) (*models.LeaveAllocation, error) {
	// TODO: Implement allocation update logic
	return nil, fmt.Errorf("not implemented")
}

func (s *leaveAllocationService) DeleteAllocation(id string) error {
	return s.allocationRepo.Delete(id)
}

func (s *leaveAllocationService) GetUserAllocations(userID string, year int) ([]models.LeaveAllocation, error) {
	return s.allocationRepo.GetByUserID(userID, year)
}

func (s *leaveAllocationService) UpdateUsedDays(userID, categoryID string, year int, days int) error {
	return s.allocationRepo.UpdateUsedDays(userID, categoryID, year, days)
}

// calculateLeaveDaysWithHolidays calculates the number of leave days based on dates, half day settings, and holidays
func (s *leaveService) calculateLeaveDaysWithHolidays(fromDate, toDate time.Time, startHalf, endHalf string, holidays []models.Holiday) float64 {
	if toDate.Before(fromDate) {
		return 0
	}

	// Create a set of holiday dates for quick lookup
	holidaySet := make(map[string]bool)
	for _, holiday := range holidays {
		if holiday.Date != nil {
			holidaySet[holiday.Date.Format("2006-01-02")] = true
		}
	}

	// Calculate working days (excluding weekends and holidays)
	days := 0.0
	current := fromDate
	for current.Before(toDate) || current.Equal(toDate) {
		// Check if it's a weekend (Saturday = 6, Sunday = 0)
		weekday := current.Weekday()
		isWeekend := weekday == time.Saturday || weekday == time.Sunday

		// Check if it's a holiday
		isHoliday := holidaySet[current.Format("2006-01-02")]

		// Count as working day if not weekend and not holiday
		if !isWeekend && !isHoliday {
			days += 1.0
		}

		current = current.AddDate(0, 0, 1)
	}

	// Handle half day adjustments
	if fromDate.Format("2006-01-02") == toDate.Format("2006-01-02") {
		// Single day leave
		if startHalf != "FULL" || endHalf != "FULL" {
			days -= 0.5
		}
	} else {
		// Multi-day leave
		if startHalf != "FULL" {
			days -= 0.5
		}
		if endHalf != "FULL" {
			days -= 0.5
		}
	}

	// Ensure non-negative result
	if days < 0 {
		days = 0
	}

	return days
}

// calculateLeaveDays calculates the number of leave days based on dates and half day settings (legacy method)
func (s *leaveService) calculateLeaveDays(fromDate, toDate time.Time, startHalf, endHalf string) float64 {
	if toDate.Before(fromDate) {
		return 0
	}

	// Calculate total days between dates
	days := toDate.Sub(fromDate).Hours()/24 + 1

	// Handle half day adjustments
	if fromDate.Format("2006-01-02") == toDate.Format("2006-01-02") {
		// Single day leave
		if startHalf != "FULL" || endHalf != "FULL" {
			days -= 0.5
		}
	} else {
		// Multi-day leave
		if startHalf != "FULL" {
			days -= 0.5
		}
		if endHalf != "FULL" {
			days -= 0.5
		}
	}

	// Ensure non-negative result
	if days < 0 {
		days = 0
	}

	return days
}
