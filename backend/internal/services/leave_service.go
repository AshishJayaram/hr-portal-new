package services

import (
	"fmt"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

// leaveService implements LeaveService interface
type leaveService struct {
	leaveRepo         repositories.LeaveRepository
	userRepo          repositories.UserRepository
	leaveCategoryRepo repositories.LeaveCategoryRepository
}

func NewLeaveService(leaveRepo repositories.LeaveRepository, userRepo repositories.UserRepository, leaveCategoryRepo repositories.LeaveCategoryRepository) LeaveService {
	return &leaveService{
		leaveRepo:         leaveRepo,
		userRepo:          userRepo,
		leaveCategoryRepo: leaveCategoryRepo,
	}
}

func (s *leaveService) ApplyLeave(req ApplyLeaveRequest) (*models.Leave, error) {
	// TODO: Implement leave application logic
	return nil, fmt.Errorf("not implemented")
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
	// TODO: Implement leave balance logic
	return nil, fmt.Errorf("not implemented")
}

func (s *leaveService) CancelLeave(id, userID string) (*models.Leave, error) {
	// TODO: Implement leave cancellation logic
	return nil, fmt.Errorf("not implemented")
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

func (s *leaveCategoryService) CreateCategory(req CreateLeaveCategoryRequest) (*models.LeaveCategory, error) {
	// TODO: Implement category creation logic
	return nil, fmt.Errorf("not implemented")
}

func (s *leaveCategoryService) GetCategory(id string) (*models.LeaveCategory, error) {
	return s.repo.GetByID(id)
}

func (s *leaveCategoryService) ListCategories(organizationID string) ([]models.LeaveCategory, error) {
	return s.repo.List(organizationID)
}

func (s *leaveCategoryService) UpdateCategory(id string, req UpdateLeaveCategoryRequest) (*models.LeaveCategory, error) {
	// TODO: Implement category update logic
	return nil, fmt.Errorf("not implemented")
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
	// TODO: Implement allocation creation logic
	return nil, fmt.Errorf("not implemented")
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
