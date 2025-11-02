package services

import (
	"fmt"
	"strconv"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

// DepartmentService interface for department business logic
type DepartmentService interface {
	CreateDepartment(organizationID string, req CreateDepartmentRequest) (*models.Department, error)
	GetDepartment(id string) (*models.Department, error)
	ListDepartments(organizationID string, filters map[string]interface{}) ([]models.Department, error)
	UpdateDepartment(id string, req UpdateDepartmentRequest) (*models.Department, error)
	DeleteDepartment(id string) error
}

// CreateDepartmentRequest represents the request to create a department
type CreateDepartmentRequest struct {
	Name        string `json:"name" validate:"required"`
	Description string `json:"description"`
	IsActive    bool   `json:"is_active"`
}

// UpdateDepartmentRequest represents the request to update a department
type UpdateDepartmentRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	IsActive    *bool   `json:"is_active"`
}

// departmentService implements DepartmentService interface
type departmentService struct {
	repo repositories.DepartmentRepository
}

// NewDepartmentService creates a new department service
func NewDepartmentService(repo repositories.DepartmentRepository) DepartmentService {
	return &departmentService{
		repo: repo,
	}
}

func (s *departmentService) CreateDepartment(organizationID string, req CreateDepartmentRequest) (*models.Department, error) {
	orgID, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Check if department with same name already exists
	existing, err := s.repo.GetByName(organizationID, req.Name)
	if err == nil && existing != nil {
		return nil, fmt.Errorf("department with name '%s' already exists", req.Name)
	}

	department := &models.Department{
		OrganizationID: uint(orgID),
		Name:           req.Name,
		Description:    req.Description,
		IsActive:       req.IsActive,
	}

	if err := s.repo.Create(department); err != nil {
		return nil, fmt.Errorf("failed to create department: %w", err)
	}

	return department, nil
}

func (s *departmentService) GetDepartment(id string) (*models.Department, error) {
	return s.repo.GetByID(id)
}

func (s *departmentService) ListDepartments(organizationID string, filters map[string]interface{}) ([]models.Department, error) {
	if filters == nil {
		filters = make(map[string]interface{})
	}
	// Default to showing only active departments unless specified
	if _, exists := filters["is_active"]; !exists {
		filters["is_active"] = true
	}
	return s.repo.List(organizationID, filters)
}

func (s *departmentService) UpdateDepartment(id string, req UpdateDepartmentRequest) (*models.Department, error) {
	department, err := s.repo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("department not found: %w", err)
	}

	if req.Name != nil {
		// Check if another department with this name exists
		existing, err := s.repo.GetByName(strconv.FormatUint(uint64(department.OrganizationID), 10), *req.Name)
		if err == nil && existing != nil && existing.ID != department.ID {
			return nil, fmt.Errorf("department with name '%s' already exists", *req.Name)
		}
		department.Name = *req.Name
	}
	if req.Description != nil {
		department.Description = *req.Description
	}
	if req.IsActive != nil {
		department.IsActive = *req.IsActive
	}

	if err := s.repo.Update(department); err != nil {
		return nil, fmt.Errorf("failed to update department: %w", err)
	}

	return department, nil
}

func (s *departmentService) DeleteDepartment(id string) error {
	return s.repo.Delete(id)
}

