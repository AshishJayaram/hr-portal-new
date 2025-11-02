package services

import (
	"fmt"
	"strconv"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

// DesignationService interface for designation business logic
type DesignationService interface {
	CreateDesignation(organizationID string, req CreateDesignationRequest) (*models.Designation, error)
	GetDesignation(id string) (*models.Designation, error)
	ListDesignations(organizationID string, filters map[string]interface{}) ([]models.Designation, error)
	UpdateDesignation(id string, req UpdateDesignationRequest) (*models.Designation, error)
	DeleteDesignation(id string) error
}

// CreateDesignationRequest represents the request to create a designation
type CreateDesignationRequest struct {
	Name        string `json:"name" validate:"required"`
	Description string `json:"description"`
	IsActive    bool   `json:"is_active"`
}

// UpdateDesignationRequest represents the request to update a designation
type UpdateDesignationRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	IsActive    *bool   `json:"is_active"`
}

// designationService implements DesignationService interface
type designationService struct {
	repo repositories.DesignationRepository
}

// NewDesignationService creates a new designation service
func NewDesignationService(repo repositories.DesignationRepository) DesignationService {
	return &designationService{
		repo: repo,
	}
}

func (s *designationService) CreateDesignation(organizationID string, req CreateDesignationRequest) (*models.Designation, error) {
	orgID, err := strconv.ParseUint(organizationID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid organization ID: %w", err)
	}

	// Check if designation with same name already exists
	existing, err := s.repo.GetByName(organizationID, req.Name)
	if err == nil && existing != nil {
		return nil, fmt.Errorf("designation with name '%s' already exists", req.Name)
	}

	designation := &models.Designation{
		OrganizationID: uint(orgID),
		Name:           req.Name,
		Description:    req.Description,
		IsActive:       req.IsActive,
	}

	if err := s.repo.Create(designation); err != nil {
		return nil, fmt.Errorf("failed to create designation: %w", err)
	}

	return designation, nil
}

func (s *designationService) GetDesignation(id string) (*models.Designation, error) {
	return s.repo.GetByID(id)
}

func (s *designationService) ListDesignations(organizationID string, filters map[string]interface{}) ([]models.Designation, error) {
	if filters == nil {
		filters = make(map[string]interface{})
	}
	// Default to showing only active designations unless specified
	if _, exists := filters["is_active"]; !exists {
		filters["is_active"] = true
	}
	return s.repo.List(organizationID, filters)
}

func (s *designationService) UpdateDesignation(id string, req UpdateDesignationRequest) (*models.Designation, error) {
	designation, err := s.repo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("designation not found: %w", err)
	}

	if req.Name != nil {
		// Check if another designation with this name exists
		existing, err := s.repo.GetByName(strconv.FormatUint(uint64(designation.OrganizationID), 10), *req.Name)
		if err == nil && existing != nil && existing.ID != designation.ID {
			return nil, fmt.Errorf("designation with name '%s' already exists", *req.Name)
		}
		designation.Name = *req.Name
	}
	if req.Description != nil {
		designation.Description = *req.Description
	}
	if req.IsActive != nil {
		designation.IsActive = *req.IsActive
	}

	if err := s.repo.Update(designation); err != nil {
		return nil, fmt.Errorf("failed to update designation: %w", err)
	}

	return designation, nil
}

func (s *designationService) DeleteDesignation(id string) error {
	return s.repo.Delete(id)
}

