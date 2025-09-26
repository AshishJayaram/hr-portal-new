package services

import (
	"fmt"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"

	"github.com/google/uuid"
)

// leaveService implements LeaveService interface
type leaveService struct {
	leaveRepo         repositories.LeaveRepository
	userRepo          repositories.UserRepository
	leaveCategoryRepo repositories.LeaveCategoryRepository
	leaveAllocationRepo repositories.LeaveAllocationRepository
}

func NewLeaveService(leaveRepo repositories.LeaveRepository, userRepo repositories.UserRepository, leaveCategoryRepo repositories.LeaveCategoryRepository, leaveAllocationRepo repositories.LeaveAllocationRepository) LeaveService {
	return &leaveService{
		leaveRepo:         leaveRepo,
		userRepo:          userRepo,
		leaveCategoryRepo: leaveCategoryRepo,
		leaveAllocationRepo: leaveAllocationRepo,
	}
}

func (s *leaveService) ApplyLeave(req ApplyLeaveRequest) (*models.Leave, error) {
	// Convert string IDs to UUIDs
	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	categoryID, err := uuid.Parse(req.CategoryID)
	if err != nil {
		return nil, fmt.Errorf("invalid category ID: %w", err)
	}

	orgID, err := uuid.Parse(req.OrganizationID)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Calculate days based on half day settings
	days := s.calculateLeaveDays(req.FromDate, req.ToDate, req.StartHalf, req.EndHalf)

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
		UserID:         userID,
		CategoryID:     categoryID,
		OrganizationID: orgID,
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

func (s *leaveService) UpdateLeave(id string, req UpdateLeaveRequest) (*models.Leave, error) {
	// TODO: Implement leave update logic
	return nil, fmt.Errorf("not implemented")
}

func (s *leaveService) ApproveLeave(id, approverID string) (*models.Leave, error) {
	err := s.leaveRepo.Approve(id, approverID)
	if err != nil {
		return nil, err
	}
	return s.leaveRepo.GetByID(id)
}

func (s *leaveService) RejectLeave(id, rejecterID, reason string) (*models.Leave, error) {
	err := s.leaveRepo.Reject(id, rejecterID, reason)
	if err != nil {
		return nil, err
	}
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

	// Get user's approved leaves for current year
	leaves, err := s.leaveRepo.GetUserLeaves(userID, currentYear)
	if err != nil {
		return nil, fmt.Errorf("failed to get user leaves: %w", err)
	}

	// Calculate balance for each category
	var balances []LeaveBalanceResponse
	for _, allocation := range allocations {
		// Calculate used days for this category
		usedDays := 0.0
		for _, leave := range leaves {
			// Convert allocation.CategoryID (uint) to string for comparison
			if fmt.Sprintf("%d", allocation.CategoryID) == leave.CategoryID.String() && leave.Status == "approved" {
				usedDays += leave.Days
			}
		}

		balance := LeaveBalanceResponse{
			CategoryID:    fmt.Sprintf("%d", allocation.CategoryID),
			CategoryName:  allocation.CategoryName,
			TotalDays:     allocation.TotalDays,
			UsedDays:      int(usedDays),
			RemainingDays: allocation.TotalDays - int(usedDays),
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
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	if leave.UserID != userUUID {
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

// calculateLeaveDays calculates the number of leave days based on dates and half day settings
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
